$ErrorActionPreference = 'Continue'
$dir = 'C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\pc-freezes-2026-11-17\refute-evidence-work'
$res = [ordered]@{}
# desktop heap or window-station trouble (Win32k 243/244/245), and process-start failures shown as popups (Application Popup 26), whole System log
foreach ($q in @(@('win32k', @{LogName='System'; ProviderName='Microsoft-Windows-Win32k'}), @('popup', @{LogName='System'; ProviderName='Application Popup'}))) {
  try {
    $ev = @(Get-WinEvent -FilterHashtable $q[1] -ErrorAction Stop)
    $res[$q[0] + '_by_id'] = @($ev | Group-Object Id | ForEach-Object { $_.Name + ' x' + $_.Count })
    $res[$q[0] + '_rows'] = @($ev | Sort-Object TimeCreated | Select-Object -Last 40 | ForEach-Object { $m=''; try { $m=[string]$_.Message } catch {}; if ($m.Length -gt 160) { $m=$m.Substring(0,160) }; $_.TimeCreated.ToString('yyyy-MM-ddTHH:mm:ss') + ' ' + $_.Id + ' ' + ($m -replace '\s+',' ') })
  } catch { $res[$q[0] + '_error'] = $_.Exception.Message }
}
# Application Hang / WER hang reports on 2026-11-17 and in the other stall windows
try {
  $h = @(Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Application Hang'} -ErrorAction Stop)
  $res.hang_by_day = @($h | Group-Object { $_.TimeCreated.ToString('yyyy-MM-dd') } | Sort-Object Name | ForEach-Object { $_.Name + ' x' + $_.Count })
  $res.hang_rows = @($h | Where-Object { $_.TimeCreated -ge [datetime]'2026-11-01' } | Sort-Object TimeCreated | ForEach-Object { $m=''; try { $m=[string]$_.Message } catch {}; if ($m.Length -gt 90) { $m=$m.Substring(0,90) }; $_.TimeCreated.ToString('yyyy-MM-ddTHH:mm:ss') + ' ' + ($m -replace '\s+',' ') })
} catch { $res.hang_error = $_.Exception.Message }
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("$dir\q3-out.json", (ConvertTo-Json -InputObject $res -Depth 4), $enc)
'ok'
