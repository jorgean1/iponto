param(
  [string]$PackagePath = (Join-Path $PSScriptRoot 'Iponto-app.zip'),
  [string]$InstallDir = 'C:\Iponto'
)

$ErrorActionPreference = 'Stop'
$logFile = Join-Path $env:TEMP 'Iponto-installer.log'
Start-Transcript -Path $logFile -Append | Out-Null

try {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Execute o instalador como administrador.'
  }
  if (-not (Test-Path -LiteralPath $PackagePath)) { throw "Pacote não encontrado: $PackagePath" }

  Write-Host '[1/7] Verificando Node.js...'
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $node) {
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) { throw 'Node.js não está instalado e o winget não foi encontrado.' }
    & $winget.Source install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements
    $nodePath = 'C:\Program Files\nodejs\node.exe'
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'A instalação do Node.js não foi localizada.' }
  } else { $nodePath = $node.Source }
  $npmPath = Join-Path (Split-Path $nodePath) 'npm.cmd'
  $npxPath = Join-Path (Split-Path $nodePath) 'npx.cmd'

  Write-Host '[2/7] Instalando arquivos...'
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  $stage = Join-Path $env:TEMP ('iponto-' + [guid]::NewGuid())
  New-Item -ItemType Directory -Path $stage | Out-Null
  Expand-Archive -LiteralPath $PackagePath -DestinationPath $stage -Force
  Get-ChildItem -Force -LiteralPath $stage | Copy-Item -Destination $InstallDir -Recurse -Force
  New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'data') | Out-Null

  Write-Host '[3/7] Instalando dependências...'
  Push-Location $InstallDir
  & $npmPath ci --omit=dev
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar as dependências do Iponto.' }

  Write-Host '[4/7] Instalando navegador da automação...'
  & $npxPath playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar o Chromium do Iponto.' }
  Pop-Location

  Write-Host '[5/7] Configurando inicialização automática...'
  $action = New-ScheduledTaskAction -Execute $nodePath -Argument 'src/server.js' -WorkingDirectory $InstallDir
  $logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $watchdogTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
  $taskSettings = New-ScheduledTaskSettingsSet -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -DontStopOnIdleEnd -StartWhenAvailable -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName 'Iponto' -Action $action -Trigger @($logonTrigger,$watchdogTrigger) -Settings $taskSettings -Description 'Serviço autônomo do Iponto com watchdog' -Force | Out-Null

  Write-Host '[6/7] Configurando rede e atalhos...'
  if (-not (Get-NetFirewallRule -DisplayName 'Iponto - Porta 3077' -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName 'Iponto - Porta 3077' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3077 -Profile Private | Out-Null
  }
  $shell = New-Object -ComObject WScript.Shell
  foreach ($shortcutPath in @(
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Iponto.lnk'),
    (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Iponto.lnk')
  )) {
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = 'http://localhost:3077'
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.Description = 'Abrir Iponto'
    $shortcut.Save()
  }

  Write-Host '[7/7] Iniciando Iponto...'
  Start-ScheduledTask -TaskName 'Iponto'
  Start-Sleep -Seconds 3
  $health = Invoke-RestMethod 'http://localhost:3077/api/health' -TimeoutSec 10
  if (-not $health.ok) { throw 'O serviço iniciou, mas não respondeu corretamente.' }
  Start-Process 'http://localhost:3077'
  Write-Host "Iponto instalado com sucesso em $InstallDir" -ForegroundColor Green
} catch {
  Write-Host "Falha na instalação: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Log: $logFile"
  Read-Host 'Pressione Enter para fechar'
  exit 1
} finally {
  if ((Get-Location).Path -ne $PSScriptRoot) { Pop-Location -ErrorAction SilentlyContinue }
  Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
}
