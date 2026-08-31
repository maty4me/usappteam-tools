# Routine healthcheck - is the daily machine actually alive?
#
# Both routines died silently for four days (2026-08-03..06): the .ps1 files were
# UTF-8 with no BOM and contained an em-dash, which Windows PowerShell 5.1 reads
# as cp1252 - the em-dash became a stray smart quote and the file failed to PARSE.
# A parse error produces no log, so "logs are empty" looked like "nothing ran"
# rather than "the script is broken". This check exists so that never repeats.
#
#     .\scripts\healthcheck.ps1            # report
#     .\scripts\healthcheck.ps1 -Install   # register a daily 18:00 check
#
# Exits non-zero if anything is wrong, so Task Scheduler shows a red LastTaskResult.

param([switch]$Install, [string]$Time = "18:00")

$Repo = Split-Path -Parent $PSScriptRoot
$TaskName = "usappteam-routine-healthcheck"

if ($Install) {
    $ps = (Get-Command powershell.exe).Source
    $action = New-ScheduledTaskAction -Execute $ps `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" `
        -WorkingDirectory $Repo
    Register-ScheduledTask -TaskName $TaskName -Action $action `
        -Trigger (New-ScheduledTaskTrigger -Daily -At $Time) `
        -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable) `
        -Description "Verifies the free-tool build and promo routines are runnable and current" -Force | Out-Null
    Write-Host "Installed '$TaskName', daily at $Time."
    exit 0
}

$problems = @()
$psl = "C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe"

# A process keeps whatever environment block it was born with, so a shell that
# started before CLAUDE_CODE_OAUTH_TOKEN was set will not see it - and neither
# will anything it launches. That made a valid token look like "Not logged in"
# on 2026-08-14. Read the persisted value directly and put it on our own
# environment; child processes inherit it. Assigning to $env: rather than
# passing it on a command line keeps the token out of the process list, out of
# the logs and off the screen.
function Import-ClaudeToken {
    if ($env:CLAUDE_CODE_OAUTH_TOKEN) { return }
    foreach ($scope in @("User", "Machine")) {
        $t = [Environment]::GetEnvironmentVariable("CLAUDE_CODE_OAUTH_TOKEN", $scope)
        if ($t) { $env:CLAUDE_CODE_OAUTH_TOKEN = $t; return }
    }
}

# 1. Do the routine scripts still PARSE under the interpreter the scheduler uses?
#    This is the check that would have caught the outage on day one.
foreach ($f in @("daily.ps1", "promote-daily.ps1", "healthcheck.ps1")) {
    $p = Join-Path $PSScriptRoot $f
    $errs = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($p, [ref]$null, [ref]$errs)
    if ($errs.Count) { $problems += "$f does not parse ($($errs.Count) errors) - the routine cannot run at all" }

    $bytes = [System.IO.File]::ReadAllBytes($p)
    $hasBom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
    $nonAscii = ($bytes | Where-Object { $_ -gt 127 }).Count
    if (-not $hasBom -and $nonAscii -gt 0) {
        $problems += "$f is BOM-less with non-ASCII bytes - PowerShell 5.1 will misparse it"
    }
}

# 2. Are the tools the routines depend on reachable without a profile?
foreach ($exe in @("claude", "python", "git", "node", "ffmpeg", "ffprobe")) {
    $r = & $psl -NoProfile -Command "if (Get-Command $exe -ErrorAction SilentlyContinue) {'y'} else {'n'}"
    if ($r -ne 'y') { $problems += "'$exe' is not on PATH for a -NoProfile scheduled run" }
}

# 3. Did the scheduled tasks actually succeed recently?
#    The build task is registered as 'usappteam-free-tool'. This list said
#    'usappteam-free-tool-daily' until 2026-08-14 - a name that has never
#    existed - so the check reported "not registered" every single day and
#    exited 1 on a false positive. A permanently red healthcheck carries no
#    information, which is exactly why nobody noticed the promo routine failing
#    from 08-05 to 08-13. Keep these names matching the -Install blocks.
foreach ($t in @("usappteam-free-tool", "usappteam-free-tool-promo")) {
    $info = Get-ScheduledTaskInfo -TaskName $t -ErrorAction SilentlyContinue
    if (-not $info) { $problems += "scheduled task '$t' is not registered"; continue }
    if ($info.LastTaskResult -ne 0) {
        $problems += "'$t' last exited $($info.LastTaskResult) at $($info.LastRunTime)"
    }
}

# 4. Has a tool actually shipped lately? The routines can "succeed" and still
#    produce nothing, which is the failure mode a log tail hides.
Set-Location $Repo
$lastTool = (& git log -1 --format=%ct -- tools/ | Out-String).Trim()
if ($lastTool) {
    $days = [math]::Floor(((Get-Date) - [System.DateTimeOffset]::FromUnixTimeSeconds([int64]$lastTool).LocalDateTime).TotalDays)
    if ($days -ge 2) { $problems += "no new tool committed in $days days" }
}

# 5. Is the CLI still authenticated? This is the fault that stopped the promo
#    routine from 2026-08-05 to 08-13: a scheduled shell does not inherit an
#    interactive login, the token had not been set, and every run died in three
#    seconds on "Not logged in". Probing at 18:00 catches a dead or expired
#    token the evening BEFORE the next 12:30 post, instead of after.
Import-ClaudeToken
$authProbe = (& $psl -NoProfile -Command "claude -p 'Reply with exactly: AUTH_OK'" 2>&1 | Out-String)
if ($authProbe -notmatch "AUTH_OK") {
    $why = ($authProbe.Trim() -replace '\s+', ' ')
    if ($why.Length -gt 160) { $why = $why.Substring(0, 160) + "..." }
    $problems += ("claude CLI is not authenticated for a scheduled run (probe: $why). " +
                  "Fix: run 'claude setup-token' interactively, then set what it issues as " +
                  "the CLAUDE_CODE_OAUTH_TOKEN user environment variable.")
}

# 6. Are social posts actually going out? Check 4 watches tools shipping; this
#    watches them being PROMOTED, which is a separate routine that can fail on
#    its own. It did, silently, for nine days. An empty queue is not a problem
#    (there is legitimately nothing to post), so only complain when work is
#    waiting and not moving.
$stateFile = Join-Path $PSScriptRoot "promo\state.json"
$queued = 0
$statusOut = (& python (Join-Path $PSScriptRoot "promote.py") --status 2>&1 | Out-String)
if ($statusOut -match "queued:\s*(\d+)") { $queued = [int]$Matches[1] }
if ($queued -gt 0) {
    if (-not (Test-Path $stateFile)) {
        $problems += "promo state.json is missing but $queued tool(s) are queued - nothing has ever posted"
    } else {
        $posted = (Get-Content $stateFile -Raw | ConvertFrom-Json).posted
        $dates = @($posted.PSObject.Properties | ForEach-Object { $_.Value.date } | Where-Object { $_ })
        if (-not $dates.Count) {
            $problems += "promo state.json records no posts but $queued tool(s) are queued"
        } else {
            $newest = ($dates | Sort-Object | Select-Object -Last 1)
            $age = [math]::Floor(((Get-Date).Date - [datetime]::Parse($newest)).TotalDays)
            if ($age -ge 2) {
                $problems += "no social post since $newest ($age days) while $queued tool(s) are queued - the promo routine is not publishing"
            }
        }
    }
}

# Report. A red LastTaskResult is invisible unless someone opens Task Scheduler,
# which is how nine days of failure went unnoticed, so a real problem also gets
# pushed to the phone over the same ntfy topic the lead watcher uses.
if ($problems.Count) {
    Write-Host "ROUTINE HEALTHCHECK: $($problems.Count) problem(s)" -ForegroundColor Red
    $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }

    try {
        $topic = (& python "C:\Users\mathi\.claude\helpers\op_secrets.py" get `
                    "op://Claude/ntfy - USAppTeam/credential" 2>$null | Out-String).Trim()
        if ($topic) {
            $body = @{
                topic    = $topic
                title    = "US APP Team routine: $($problems.Count) problem(s)"
                message  = ($problems -join "`n")
                priority = 4
                tags     = @("warning")
            } | ConvertTo-Json -Depth 4
            Invoke-RestMethod -Uri "https://ntfy.sh/" -Method Post -ContentType "application/json" `
                -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 30 | Out-Null
            Write-Host "  (pushed to phone)"
        }
    } catch {
        # A failed alert must not mask the problems it was trying to report.
        Write-Host "  (ntfy push failed: $($_.Exception.Message))" -ForegroundColor Yellow
    }
    exit 1
}
Write-Host "ROUTINE HEALTHCHECK: all clear" -ForegroundColor Green
exit 0
