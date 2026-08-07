# Free Tool runner - Monday, Wednesday and Friday.
#
# The cloud routine builds tools correctly but cannot push: the Claude GitHub
# App has read but not contents:write on this repo (see SETUP.md). This machine
# pushes fine via Git Credential Manager, so the same job runs here instead and
# the daily cadence does not depend on that permission.
#
# Install once (elevated PowerShell):
#     .\scripts\daily.ps1 -Install
# Change the cadence:
#     .\scripts\daily.ps1 -Install -Days Monday,Thursday -Time 08:00
# Run by hand any time:
#     .\scripts\daily.ps1
#
# Logs land in scripts/logs/ so a silent failure is still discoverable.

param(
    [switch]$Install,
    [switch]$Uninstall,
    [string]$Time = "07:00",
    [string[]]$Days = @("Monday", "Wednesday", "Friday")
)

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot
$TaskName = "usappteam-free-tool"
$LegacyTaskName = "usappteam-free-tool-daily"

if ($Install) {
    # The cadence moved from daily to three times a week on 2026-08-08. The old
    # task is removed by name so the two cannot both fire.
    if (Get-ScheduledTask -TaskName $LegacyTaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $LegacyTaskName -Confirm:$false
        Write-Host "Removed the old daily task '$LegacyTaskName'."
    }

    $ps = (Get-Command powershell.exe).Source
    $action = New-ScheduledTaskAction -Execute $ps `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" `
        -WorkingDirectory $Repo
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $Time
    # StartWhenAvailable catches up if the machine was asleep at the trigger time,
    # which is the whole point of a scheduled cadence on a workstation.
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
        -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Hours 3)
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
        -Settings $settings -Description "Builds and ships a free tool to tools.usappteam.com on $($Days -join ', ')" -Force | Out-Null
    Write-Host "Installed '$TaskName' — $($Days -join ', ') at $Time."
    Write-Host "Next run: $((Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime)"
    exit 0
}

if ($Uninstall) {
    foreach ($n in @($TaskName, $LegacyTaskName)) {
        if (Get-ScheduledTask -TaskName $n -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $n -Confirm:$false
            Write-Host "Removed '$n'."
        }
    }
    exit 0
}

# ---------------- the daily run ----------------

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))

function Say($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
    Write-Host $line
    Add-Content -Path $log -Value $line
}

# git writes ordinary progress to stderr, which under $ErrorActionPreference='Stop'
# becomes a NativeCommandError and kills the run. Route every git call through
# here: it reports a real non-zero exit and otherwise gets out of the way.
function Git-Try($argline) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $out = (& git @argline 2>&1 | Out-String).Trim()
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { Say "git $($argline -join ' ') -> exit $code`n$out" }
    return $code
}

Set-Location $Repo
Say "=== free tool of the day ==="

# A dirty tree means an earlier run died mid-flight, or someone left work here.
# Rebasing onto that silently drops the day, so stash it and say so.
$dirty = (& git status --porcelain | Out-String).Trim()
if ($dirty) {
    Say "working tree dirty; stashing before pull:`n$dirty"
    Git-Try @("stash", "push", "-u", "-m", "daily.ps1 autostash") | Out-Null
}

Git-Try @("fetch", "--quiet", "origin", "main") | Out-Null
if ((Git-Try @("pull", "--quiet", "--rebase", "origin", "main")) -ne 0) {
    Say "FAILED: could not pull origin/main. Not building on a stale tree."
    exit 1
}

$backlog = Get-Content "research/backlog.json" -Raw | ConvertFrom-Json
$next = $backlog.items | Where-Object { $_.status -eq "todo" } | Select-Object -First 1
if (-not $next) {
    Say "backlog empty - nothing to build. Re-run the research step (see ROUTINE.md)."
    exit 0
}
if (Test-Path "tools/$($next.slug)") {
    Say "tools/$($next.slug) already exists; the backlog is stale. Fix it and re-run."
    exit 1
}

Say "building: $($next.title)  [$($next.slug)]"

# Claude Code does the creative work. ROUTINE.md and TOOL-SPEC.md in the repo are
# the binding instructions - this prompt only points at them so there is one
# source of truth for how a tool gets built.
$prompt = @"
Build today's free tool for tools.usappteam.com, then ship it.

Read ROUTINE.md and TOOL-SPEC.md in this repo first - they are the binding
instructions and override anything you assume. Then follow ROUTINE.md in order.

Today's tool is '$($next.title)' (slug: $($next.slug)), the top todo item in
research/backlog.json. Write exactly four files in tools/$($next.slug)/ and
nothing else: tool.json, tool.html, index.md, demo.mjs. CI generates the card
preview and the demo video, so do not create those.

Before pushing, all three must pass: npm run build, npm run validate,
npm run smoke. Do not push red.

Then commit, push to main, mark the backlog item live, and push that too.
Git credentials on this machine work, so a push failure is a real error worth
reporting rather than a known blocker.
"@

$claude = (Get-Command claude -ErrorAction SilentlyContinue)
if (-not $claude) {
    Say "ERROR: the 'claude' CLI is not on PATH for this task's environment."
    exit 1
}

# Check auth BEFORE building anything. A scheduled shell does not inherit the
# interactive login: every run between 2026-08-06 and 08-07 got "Not logged in"
# and burned the day, and the only trace was a log file nobody reads. Headless
# runs need CLAUDE_CODE_OAUTH_TOKEN, which `claude setup-token` issues once.
$ErrorActionPreference = "Continue"
$authProbe = (& $claude.Source -p "Reply with exactly: AUTH_OK" 2>&1 | Out-String)
$ErrorActionPreference = "Stop"
if ($authProbe -notmatch "AUTH_OK") {
    Say "BLOCKED: the Claude CLI is not authenticated in this task's environment."
    Say "  probe returned: $($authProbe.Trim() -replace '\s+', ' ')"
    Say "  Fix once, in an interactive terminal:"
    Say "    claude setup-token"
    Say "  then set the token it issues as the CLAUDE_CODE_OAUTH_TOKEN user environment"
    Say "  variable so scheduled runs inherit it. Nothing was built."
    exit 2
}

Say "handing off to claude..."
& $claude.Source -p $prompt --permission-mode bypassPermissions 2>&1 | Tee-Object -Append -FilePath $log

Git-Try @("fetch", "--quiet", "origin", "main") | Out-Null
$local = (& git rev-parse HEAD | Out-String).Trim()
$remote = (& git rev-parse origin/main | Out-String).Trim()

if (Test-Path "tools/$($next.slug)/tool.json") {
    if ($local -eq $remote) {
        Say "SHIPPED: $($next.slug) - pushed. Confirming CI picked it up..."
        # Push triggers stopped creating runs on 2026-08-06 while dispatch still
        # worked, so a pushed tool could deploy with no video and nothing to show
        # it had failed. This turns that into a self-healing step.
        $ci = & python scripts/ensure-ci.py --wait 120 --rerender $next.slug 2>&1 | Out-String
        Say $ci.Trim()
    } else {
        Say "WARNING: $($next.slug) was built but local and remote differ. Check the push."
    }
} else {
    Say "FAILED: no tools/$($next.slug)/ produced. See the log above."
    exit 1
}
