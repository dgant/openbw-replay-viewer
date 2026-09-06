$ErrorActionPreference = 'Stop'

$desktopRoot = Split-Path -Parent $PSScriptRoot
$releaseDir = Join-Path $desktopRoot 'dist/replay-viewer-desktop'
$executable = Join-Path $releaseDir 'replay-viewer-desktop-win_x64.exe'
foreach ($file in @($executable, (Join-Path $releaseDir 'resources.neu'))) {
    if (!(Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Build the desktop viewer before registering it: missing $file"
    }
}

$progId = 'Applications\replay-viewer-desktop-win_x64.exe'
$classes = 'HKCU:\Software\Classes'
$commandKey = "$classes\$progId\shell\open\command"
New-Item -Path $commandKey -Force | Out-Null
Set-Item -LiteralPath $commandKey -Value ('"{0}" "%1"' -f $executable)
New-Item -Path "$classes\.rep" -Force | Out-Null
Set-Item -LiteralPath "$classes\.rep" -Value $progId
New-Item -Path "$classes\.rep\OpenWithProgids" -Force | Out-Null
New-ItemProperty -Path "$classes\.rep\OpenWithProgids" -Name $progId -Value '' -PropertyType String -Force | Out-Null
Write-Output "Registered .rep viewer: $executable"
