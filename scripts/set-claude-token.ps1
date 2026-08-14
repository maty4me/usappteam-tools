# Stores the Claude Code OAuth token for scheduled runs, without letting it
# render anywhere. Run `claude setup-token` first, then this, and paste the
# token at the hidden prompt.
#
#     .\scripts\set-claude-token.ps1

$secure = Read-Host "Paste the token from 'claude setup-token' (input is hidden)" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringUni(
    [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secure))

if (-not $plain -or $plain -notmatch '^sk-ant-') {
    Write-Host "That does not look like a Claude token (expected it to start with sk-ant-). Nothing was saved."
    exit 1
}

[Environment]::SetEnvironmentVariable("CLAUDE_CODE_OAUTH_TOKEN", $plain, "User")

# Always read back before believing a success message.
$back = [Environment]::GetEnvironmentVariable("CLAUDE_CODE_OAUTH_TOKEN", "User")
if ($back -eq $plain) {
    Write-Host "Saved. Verifying the CLI accepts it in a fresh environment..."
} else {
    Write-Host "FAILED: the read-back did not match. Nothing verified."
    exit 1
}

# Probe exactly the way the scheduled task does: new process, -NoProfile.
$probe = powershell -NoProfile -Command "`$env:CLAUDE_CODE_OAUTH_TOKEN='$back'; claude -p 'Reply with exactly: AUTH_OK' 2>&1" | Out-String
if ($probe -match "AUTH_OK") {
    Write-Host "Verified: headless auth works. The Friday 07:00 run will build."
} else {
    Write-Host "FAILED: the CLI still cannot authenticate headlessly. Probe said:"
    Write-Host ("  " + ($probe.Trim() -replace '\s+', ' '))
    exit 1
}
