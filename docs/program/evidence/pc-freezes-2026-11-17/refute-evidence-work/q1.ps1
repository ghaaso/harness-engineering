$ErrorActionPreference = 'Continue'
$dir = 'C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\pc-freezes-2026-11-17\refute-evidence-work'
$out = New-Object System.Collections.ArrayList
function Add-Ev($tag, $e) {
  $m = ''; try { $m = [string]$e.Message } catch {}
  if ($m.Length -gt 260) { $m = $m.Substring(0,260) }
  [void]$out.Add([pscustomobject]@{ tag=$tag; time=$e.TimeCreated.ToString('yyyy-MM-ddTHH:mm:ss.fff'); log=$e.LogName; provider=$e.ProviderName; id=$e.Id; level=$e.Level; pid=$e.ProcessId; msg=($m -replace '\s+',' ') })
}
$wins = @(
  @('w06', '2026-11-06T13:35:00', '2026-11-06T15:14:00'),
  @('w1',  '2026-11-17T01:05:00', '2026-11-17T01:45:00'),
  @('w2',  '2026-11-17T02:20:00', '2026-11-17T02:57:00'),
  @('w3',  '2026-11-17T04:58:00', '2026-11-17T05:45:00'),
  @('w3b', '2026-11-17T07:25:00', '2026-11-17T07:46:00'),
  @('w4',  '2026-11-17T15:15:00', '2026-11-17T15:47:00'),
  @('w5',  '2026-11-17T16:10:00', '2026-11-17T16:45:00')
)
foreach ($w in $wins) {
  $a = [datetime]$w[1]; $b = [datetime]$w[2]
  foreach ($ln in @('System','Application')) {
    try { Get-WinEvent -FilterHashtable @{LogName=$ln; StartTime=$a; EndTime=$b} -ErrorAction Stop | ForEach-Object { Add-Ev $w[0] $_ } } catch { [void]$out.Add([pscustomobject]@{tag=$w[0]; log=$ln; msg=('none or error: ' + $_.Exception.Message)}) }
  }
  try {
    $wmi = @(Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-WMI-Activity/Operational'; StartTime=$a; EndTime=$b} -ErrorAction Stop)
    $byId = $wmi | Group-Object Id | ForEach-Object { $_.Name + 'x' + $_.Count }
    $first = ($wmi | Sort-Object TimeCreated | Select-Object -First 1).TimeCreated
    $last = ($wmi | Sort-Object TimeCreated | Select-Object -Last 1).TimeCreated
    $cli = $wmi | Where-Object { $_.Id -eq 5858 } | ForEach-Object { if ($_.Message -match 'ClientProcessId = (\d+)') { $matches[1] } } | Group-Object | ForEach-Object { $_.Name + 'x' + $_.Count }
    $perMin = $wmi | Group-Object { $_.TimeCreated.ToString('HH:mm') } | Sort-Object Name | ForEach-Object { $_.Name + '=' + $_.Count }
    [void]$out.Add([pscustomobject]@{tag=$w[0]; log='WMI-Activity'; msg=('count ' + $wmi.Count + ' ids ' + ($byId -join ',') + ' first ' + $first + ' last ' + $last + ' clients5858 ' + ($cli -join ',') + ' perMin ' + ($perMin -join ' '))})
  } catch { [void]$out.Add([pscustomobject]@{tag=$w[0]; log='WMI-Activity'; msg=('none or error: ' + $_.Exception.Message)}) }
}
# service control manager: everything that names 360 or QH, and every 7011/7022/7023/7024/7043 (timeouts, hangs), whole log
try { Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Service Control Manager'} -ErrorAction Stop | Where-Object { $_.Message -match '360|QH' -or @(7011,7022,7043,7009) -contains $_.Id } | ForEach-Object { Add-Ev 'scm' $_ } } catch { [void]$out.Add([pscustomobject]@{tag='scm'; msg=('error: ' + $_.Exception.Message)}) }
# Application log: anything from 360 or naming QHActiveDefense, whole log
try { Get-WinEvent -FilterHashtable @{LogName='Application'} -ErrorAction Stop | Where-Object { $_.ProviderName -match '360|QH' -or $_.Message -match 'QHActiveDefense|QHWatchdog|360Tray|QHSafeTray' } | ForEach-Object { Add-Ev 'app360' $_ } } catch { [void]$out.Add([pscustomobject]@{tag='app360'; msg=('error: ' + $_.Exception.Message)}) }
# kernel power events around 07:34, and the power log of that boot
try { Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; StartTime=[datetime]'2026-11-17T05:00:00'; EndTime=[datetime]'2026-11-17T08:05:00'} -ErrorAction Stop | ForEach-Object { Add-Ev 'kpower' $_ } } catch { [void]$out.Add([pscustomobject]@{tag='kpower'; msg=('none or error: ' + $_.Exception.Message)}) }
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("$dir\q1-out.json", (ConvertTo-Json -InputObject @($out) -Depth 3), $enc)
'rows ' + $out.Count
