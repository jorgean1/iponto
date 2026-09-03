$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $project 'dist'
$stage = Join-Path $env:TEMP ('iponto-build-' + [guid]::NewGuid())
$appStage = Join-Path $stage 'app'
New-Item -ItemType Directory -Force -Path $dist,$appStage | Out-Null

$include = @('src','public','extension','package.json','package-lock.json','README.md','install-windows-task.ps1','iniciar-iponto.cmd','output\pdf\Manual-do-Iponto.pdf')
foreach ($item in $include) {
  $source = Join-Path $project $item
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $appStage -Recurse -Force }
}
$appZip = Join-Path $stage 'Iponto-app.zip'
Compress-Archive -Path (Join-Path $appStage '*') -DestinationPath $appZip -Force
Copy-Item (Join-Path $PSScriptRoot 'setup.cmd'),(Join-Path $PSScriptRoot 'Instalar-Iponto.ps1') -Destination $stage

$setupZip = Join-Path $dist 'Iponto-Setup.zip'
Compress-Archive -Path (Join-Path $stage 'setup.cmd'),(Join-Path $stage 'Instalar-Iponto.ps1'),(Join-Path $stage 'Iponto-app.zip') -DestinationPath $setupZip -Force

$targetExe = Join-Path $dist 'Iponto-Setup.exe'
if (Test-Path -LiteralPath $targetExe) { Remove-Item -LiteralPath $targetExe -Force }
$sed = Join-Path $stage 'iponto.sed'
$sourceDir = $stage + '\'
$content = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName="$targetExe"
FriendlyName="Instalador do Iponto"
AppLaunched="setup.cmd"
PostInstallCmd=<None>
AdminQuietInstCmd="setup.cmd"
UserQuietInstCmd="setup.cmd"
FILE0="setup.cmd"
FILE1="Instalar-Iponto.ps1"
FILE2="Iponto-app.zip"
[SourceFiles]
SourceFiles0=$sourceDir
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
"@
Set-Content -LiteralPath $sed -Value $content -Encoding ASCII
& iexpress.exe /N /Q $sed
for ($attempt = 0; $attempt -lt 30 -and -not (Test-Path -LiteralPath $targetExe); $attempt++) {
  Start-Sleep -Seconds 1
}
if (-not (Test-Path -LiteralPath $targetExe)) { throw 'O IExpress não gerou o executável.' }
Get-ChildItem -LiteralPath $dist -Filter '~Iponto-Setup.CAB' -ErrorAction SilentlyContinue | Remove-Item -Force
$extensionZip = Join-Path $dist 'Iponto-Extensao-Chrome.zip'
Compress-Archive -Path (Join-Path $project 'extension\*') -DestinationPath $extensionZip -Force
Remove-Item -LiteralPath $stage -Recurse -Force
Get-Item $targetExe,$setupZip,$extensionZip | Select-Object FullName,Length
