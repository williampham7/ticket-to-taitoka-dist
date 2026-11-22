# Creates one "Ticket to Taitoka" shortcut on the Desktop; it runs play-online.bat with the combined icon.
# Usage: powershell -ExecutionPolicy Bypass -File desktop\make-shortcut.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop 'Ticket to Taitoka.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = Join-Path $here 'play-online.bat'
$s.WorkingDirectory = Split-Path -Parent $here
$s.IconLocation = (Join-Path $here 'icon.ico') + ',0'
$s.Description = 'Start the Ticket to Taitoka game server online (USA, China or Europe edition) and open it in the browser'
$s.WindowStyle = 1
$s.Save()
Write-Output "Created $lnk"
