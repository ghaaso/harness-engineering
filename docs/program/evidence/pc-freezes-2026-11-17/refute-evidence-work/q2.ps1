$ErrorActionPreference = 'Continue'
$dir = 'C:\Users\User\Documents\projects\harness-engineering\docs\program\evidence\pc-freezes-2026-11-17\refute-evidence-work'
$res = [ordered]@{}
# 1. Software Protection scheduling results (16384 success, 16385 failure) per day, whole Application log, with the error code
try {
  $spp = @(Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Microsoft-Windows-Security-SPP'; Id=16384,16385} -ErrorAction Stop)
  $res.spp_by_day = @($spp | Group-Object { $_.TimeCreated.ToString('yyyy-MM-dd') + ' ' + $_.Id } | Sort-Object Name | ForEach-Object { $_.Name + ' x' + $_.Count })
  $fail = $spp | Where-Object { $_.Id -eq 16385 } | Sort-Object TimeCreated
  $res.spp_fail_codes = @($fail | ForEach-Object { if ($_.Message -match 'Error Code: (0x[0-9A-Fa-f]+)') { $matches[1] } else { '?' } } | Group-Object | ForEach-Object { $_.Name + ' x' + $_.Count })
  # runs of failures: first and last time of each run separated by > 15 min
  $runs = @(); $start = $null; $prev = $null; $n = 0
  foreach ($e in $fail) { if ($prev -and ($e.TimeCreated - $prev).TotalMinutes -gt 15) { $runs += ($start.ToString('MM-dd HH:mm:ss') + ' to ' + $prev.ToString('MM-dd HH:mm:ss') + ' n=' + $n); $start = $null; $n = 0 }; if (-not $start) { $start = $e.TimeCreated }; $prev = $e.TimeCreated; $n++ }
  if ($start) { $runs += ($start.ToString('MM-dd HH:mm:ss') + ' to ' + $prev.ToString('MM-dd HH:mm:ss') + ' n=' + $n) }
  $res.spp_fail_runs = $runs
} catch { $res.spp_error = $_.Exception.Message }
# 2. all System and Application events in the two non-360 stall windows of the app log
$wins = @(@('2026-11-13T20:45:00','2026-11-13T23:05:00'), @('2026-11-14T16:05:00','2026-11-14T18:06:00'), @('2026-11-02T14:40:00','2026-11-02T16:27:00'), @('2026-11-15T01:50:00','2026-11-15T03:04:00'), @('2026-10-07T15:00:00','2026-10-07T16:05:00'))
$ev = New-Object System.Collections.ArrayList
foreach ($w in $wins) { foreach ($ln in @('System','Application')) { try { Get-WinEvent -FilterHashtable @{LogName=$ln; StartTime=[datetime]$w[0]; EndTime=[datetime]$w[1]} -ErrorAction Stop | ForEach-Object { $m=''; try { $m=[string]$_.Message } catch {}; if ($m.Length -gt 180) { $m=$m.Substring(0,180) }; [void]$ev.Add(($_.TimeCreated.ToString('yyyy-MM-ddTHH:mm:ss') + ' ' + $ln.Substring(0,3) + ' ' + $_.ProviderName + ' ' + $_.Id + ' L' + $_.Level + ' ' + ($m -replace '\s+',' '))) } } catch { [void]$ev.Add($w[0] + ' ' + $ln + ' none: ' + $_.Exception.Message) } } }
$res.other_windows = @($ev | Sort-Object)
# 3. powershell.exe processes now, with parent, and the antivirus service process if present
try {
  $all = @(Get-CimInstance Win32_Process -ErrorAction Stop)
  $byId = @{}; foreach ($p in $all) { $byId[[int]$p.ProcessId] = $p }
  $res.ps_now = @($all | Where-Object { $_.Name -eq 'powershell.exe' } | ForEach-Object { $pp = $byId[[int]$_.ParentProcessId]; $c = [string]$_.CommandLine; if ($c.Length -gt 140) { $c = $c.Substring(0,140) }; ([string]$_.ProcessId + ' parent=' + $(if ($pp) { $pp.Name } else { 'gone' }) + ' created=' + $_.CreationDate.ToString('HH:mm:ss') + ' cmd=' + $c) })
  $res.qh_now = @($all | Where-Object { $_.Name -match '^QH|^360' } | ForEach-Object { ($_.Name + ' pid=' + $_.ProcessId + ' created=' + $_.CreationDate.ToString('MM-dd HH:mm:ss') + ' ws_mb=' + [math]::Round($_.WorkingSetSize/1MB,1) + ' vsize_mb=' + [math]::Round($_.VirtualSize/1MB,1) + ' private_mb=' + [math]::Round($_.PrivatePageCount/1MB,1) + ' handles=' + $_.HandleCount) })
  $res.count_now = 'procs=' + $all.Count + ' powershell=' + @($all | Where-Object { $_.Name -eq 'powershell.exe' }).Count + ' node=' + @($all | Where-Object { $_.Name -eq 'node.exe' }).Count
} catch { $res.proc_error = $_.Exception.Message }
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("$dir\q2-out.json", (ConvertTo-Json -InputObject $res -Depth 4), $enc)
'ok ' + $ev.Count
