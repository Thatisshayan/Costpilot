$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
node scripts/verify.mjs
exit $LASTEXITCODE
