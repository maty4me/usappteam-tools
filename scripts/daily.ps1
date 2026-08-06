# Free Tool of the Day - local runner.
#
# The cloud routine builds tools correctly but cannot push: the Claude GitHub
# App has read but not contents:write on this repo (see SETUP.md). This machine
# pushes fine via Git Credential Manager, so the same job runs here instead and
# the daily cadence does not depend on that permission.
#
# Install once (elevated PowerShell):
#     .\scripts\daily.ps1 -Install
# Run by hand any time:
#     .\scripts\daily.ps1
#
# Logs land in scripts/logs/ so a silent failure is still discoverable.

param(
    [switch]$Install,
    [switch]$Uninstall,
    [string]$Time = "07:00"
)

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot
$TaskName = "usappteam-free-tool-daily"

if ($Install) {
    $ps = (Get-Command powershell.exe).Source
    $action = New-ScheduledTaskAction -Execute $ps `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" `
        -WorkingDirectory $Repo
    $trigger = New-ScheduledTaskTrigger -Daily -At $Time
    # StartWhenAvailable catches up if the machine was asleep at the trigger time,
    # which is the whole point of a daily cadence on a workstation.
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
        -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Hours 3)
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
        -Settings $settings -Description "Builds and ships one free tool per day to tools.usappteam.com" -Force | Out-Null
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

Say "handing off to claude..."
& $claude.Source -p $prompt --permission-mode bypassPermissions 2>&1 | Tee-Object -Append -FilePath $log

Git-Try @("fetch", "--quiet", "origin", "main") | Out-Null
$local = (& git rev-parse HEAD | Out-String).Trim()
$remote = (& git rev-parse origin/main | Out-String).Trim()

if (Test-Path "tools/$($next.slug)/tool.json") {
    if ($local -eq $remote) {
        Say "SHIPPED: $($next.slug) - pushed. CI will render the video and deploy."
    } else {
        Say "WARNING: $($next.slug) was built but local and remote differ. Check the push."
    }
} else {
    Say "FAILED: no tools/$($next.slug)/ produced. See the log above."
    exit 1
}
