$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$localElectron = Join-Path $root "node_modules\.bin\electron.cmd"
$runtimeRoot = "C:\tmp\character-todo-runtime"
$runtimeElectron = Join-Path $runtimeRoot "node_modules\.bin\electron.cmd"

if (Test-Path $localElectron) {
  & $localElectron $root
  exit $LASTEXITCODE
}

if (-not (Test-Path $runtimeElectron)) {
  npm install --prefix $runtimeRoot electron@31.7.7 --no-audit --no-fund
}

& $runtimeElectron $root
exit $LASTEXITCODE
