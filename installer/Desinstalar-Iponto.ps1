param([string]$InstallDir = 'C:\Iponto', [switch]$ApagarDados)
$ErrorActionPreference = 'Stop'
Stop-ScheduledTask -TaskName 'Iponto' -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'Iponto' -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName 'Iponto - Porta 3077' -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Iponto.lnk') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Iponto.lnk') -Force -ErrorAction SilentlyContinue
if ($ApagarDados) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
else {
  Get-ChildItem -LiteralPath $InstallDir -Force | Where-Object Name -ne 'data' | Remove-Item -Recurse -Force
  Write-Host "Aplicação removida. Configurações preservadas em $InstallDir\data"
}
