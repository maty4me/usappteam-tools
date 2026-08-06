# Free Tool Promo - local runner.
#
# Publishes ONE tool's demo video per day as a social post: FB Page video +
# IG Reel, one tool per post, walking the library in shipped order and picking
# up new tools automatically once their video renders.
#
# Runs here rather than in the cloud for the same reason daily.ps1 does: this
# machine has the 1Password desktop integration and the rendered media.
#
# Install once (elevated PowerShell):
#     .\scripts\promote-daily.ps1 -Install
# Run by hand any time:
#     .\scripts\promote-daily.ps1
#
# Logs land in scripts/logs/promo-*.log.

param(
    [switch]$Install,
    [switch]$Uninstall,
    [string]$Time = "12:30"
)

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot
$TaskName = "usappteam-free-tool-promo"

if ($Install) {
    $ps = (Get-Command powershell.exe).Source
    $action = New-ScheduledTaskAction -Execute $ps `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" `
        -WorkingDirectory $Repo
    $trigger = New-ScheduledTaskTrigger -Daily -At $Time
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
        -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Hours 2)
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
        -Settings $settings -Description "Promotes one free tool per day to the US APP Team FB Page and IG" -Force | Out-Null
    Write-Host "Installed '$TaskName', daily at $Time."
    Write-Host "Next run: $((Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime)"
    exit 0
}

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed '$TaskName'."
    exit 0
}

# ---------------- the daily run ----------------

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("promo-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))

function Say($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
    Write-Host $line
    Add-Content -Path $log -Value $line
}

Set-Location $Repo
Say "=== free tool promo ==="

# git reports progress on stderr; under $ErrorActionPreference='Stop' that would
# abort the run. Promoting from a slightly stale tree is harmless, so a failed
# pull is logged and stepped over rather than fatal.
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$pullOut = (& git pull --quiet --rebase origin main 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { Say "warning: git pull failed (continuing on local tree)`n$pullOut" }
$ErrorActionPreference = $prev

# Which tool is up? promote.py owns the queue and the no-duplicates rule.
$nextJson = & python scripts/promote.py --next 2>&1 | Out-String
if ($nextJson -match "QUEUE EMPTY") {
    Say "queue empty - every rendered tool has been promoted. Nothing to do."
    exit 0
}
$next = $nextJson | ConvertFrom-Json
Say "promoting: $($next.title)  [$($next.slug)]"

# Claude writes the captions; promote.py publishes. Splitting it this way keeps
# the creative step model-driven and the irreversible step deterministic.
$capFile = "scripts/promo/captions-$($next.slug).json"
$prompt = @"
Write the social captions for today's US APP Team free-tool promo post, then publish it.

The tool is '$($next.title)' (slug: $($next.slug)).
  URL:      $($next.url)
  Tagline:  $($next.tagline)
  Details:  $($next.description)

Read tools/$($next.slug)/index.md and tools/$($next.slug)/tool.json for what the
tool actually does and what makes it better than what currently ranks. The post
is about THIS ONE TOOL only - never a roundup of the library.

Write $capFile as UTF-8 JSON with exactly two keys:
  "fb" - Facebook Page copy. Lead with the problem the tool solves, say plainly
         what it does and why ours is honest (client-side, no upload, no email),
         then the URL. A few short paragraphs, no hashtag spam.
  "ig" - Instagram Reel caption. Tighter, same substance, ending with the URL
         and 5-7 relevant hashtags.

Hard rules:
  - Both captions MUST contain the tool's full URL exactly as given above.
  - NEVER invent a price. Only these may appear: `$3,500 / `$7,500 / `$12,000 /
    `$199 / `$399 / `$799 / `$749. Omitting price entirely is fine and usually better.
  - Claim nothing the tool does not do. Read the files; do not guess at features.
  - No emoji-stuffing, no "game changer"/"revolutionary" marketing voice.

Then run, from the repo root:
    python scripts/promote.py --captions $capFile --preflight
Fix anything it reports, then publish for real:
    python scripts/promote.py --captions $capFile

Publishing is pre-authorized for this routine - it is the whole point of the run.
Report the FB and IG ids it prints, or the exact error if it failed.
"@

$claude = (Get-Command claude -ErrorAction SilentlyContinue)
if (-not $claude) {
    Say "ERROR: the 'claude' CLI is not on PATH for this task's environment."
    exit 1
}

Say "handing off to claude..."
& $claude.Source -p $prompt --permission-mode bypassPermissions 2>&1 | Tee-Object -Append -FilePath $log

# promote.py's state file is the truth about what actually published.
$state = if (Test-Path "scripts/promo/state.json") {
    Get-Content "scripts/promo/state.json" -Raw | ConvertFrom-Json
} else { $null }
$entry = $state.posted.$($next.slug)

if ($entry -and $entry.fb -and $entry.ig) {
    Say "POSTED: $($next.slug) - FB $($entry.fb.id), IG $($entry.ig.id)"
} elseif ($entry) {
    Say "PARTIAL: $($next.slug) - fb=$([bool]$entry.fb) ig=$([bool]$entry.ig). Tomorrow's run resumes the missing one."
    exit 1
} else {
    Say "FAILED: $($next.slug) did not publish. See the log above."
    exit 1
}
