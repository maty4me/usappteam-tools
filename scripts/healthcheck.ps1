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
foreach ($exe in @("claude", "python", "git", "node", "ffmpeg")) {
    $r = & $psl -NoProfile -Command "if (Get-Command $exe -ErrorAction SilentlyContinue) {'y'} else {'n'}"
    if ($r -ne 'y') { $problems += "'$exe' is not on PATH for a -NoProfile scheduled run" }
}

# 3. Did the scheduled tasks actually succeed recently?
foreach ($t in @("usappteam-free-tool-daily", "usappteam-free-tool-promo")) {
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

if ($problems.Count) {
    Write-Host "ROUTINE HEALTHCHECK: $($problems.Count) problem(s)" -ForegroundColor Red
    $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "ROUTINE HEALTHCHECK: all clear" -ForegroundColor Green
exit 0
