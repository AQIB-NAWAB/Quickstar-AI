param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot
function Run-Checked([scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "Command failed. Resolve the error before continuing." }
}
foreach ($command in @('node','pnpm','docker')) {
    if (!(Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command is missing. Install it before running setup." }
}
Run-Checked { node -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major<22 || (major===22 && minor<12)) { console.error('Use Node 22.12 or newer.'); process.exit(1); }" }
Run-Checked { docker info --format '{{.ServerVersion}}' }
if (!(Test-Path '.env')) { Copy-Item '.env.example' '.env' }
if (!(Test-Path '.env.leads')) {
    Copy-Item '.env.leads.example' '.env.leads'
    $content = Get-Content '.env.leads' -Raw
    foreach ($name in @('platform-admin','model-internal','web-internal')) {
        $secret = & node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
        if ($LASTEXITCODE -ne 0) { throw 'Could not generate local credentials.' }
        $content = $content.Replace("replace-with-a-random-$name-token", $secret)
    }
    [System.IO.File]::WriteAllText((Join-Path $repoRoot '.env.leads'), $content)
}
Run-Checked { docker compose up -d --wait postgres valkey otel-collector }
if (!$SkipInstall) { Run-Checked { pnpm install --frozen-lockfile } }
Run-Checked { pnpm -r --filter './packages/*' run build }
foreach ($service in @('identity','workspace','gateway','agent','conversation','runtime','model-gateway','web-fetch','lead-generation')) {
    Run-Checked { pnpm --filter "@quickstart/service-$service" build }
}
foreach ($service in @('identity','workspace','agent','conversation','web-fetch','lead-generation')) {
    Run-Checked { pnpm --filter "@quickstart/service-$service" exec node --env-file=../../.env --env-file=../../.env.leads dist/migrate.js }
}
Write-Host 'Setup complete. Start identity, workspace, gateway, and lead-generation in separate terminals.'
Write-Host 'Use the commands in docs/lead-generation.md. No service processes were started by this script.'
