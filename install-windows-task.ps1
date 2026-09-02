$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodePath = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $nodePath -Argument 'src/server.js' -WorkingDirectory $projectDir
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$watchdogTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -DontStopOnIdleEnd -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'Iponto' -Action $action -Trigger @($logonTrigger,$watchdogTrigger) -Settings $settings -Description 'Serviço autônomo do Iponto com watchdog' -Force | Out-Null
Start-ScheduledTask -TaskName 'Iponto'
Write-Host 'Tarefa Iponto instalada e iniciada. O watchdog verifica o serviço a cada 5 minutos.'
