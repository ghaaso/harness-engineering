# logs the machine every two seconds to a file flushed to disk, and stops this build's own processes if they pile up
param([string]$Log)
$fs = New-Object IO.FileStream($Log,[IO.FileMode]::Append,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite,4096,[IO.FileOptions]::WriteThrough)
$sw = New-Object IO.StreamWriter($fs); $sw.AutoFlush = $true
$free = New-Object Diagnostics.PerformanceCounter('Memory','Available MBytes')
$cpu = New-Object Diagnostics.PerformanceCounter('Processor','% Processor Time','_Total'); [void]$cpu.NextValue()
$end = (Get-Date).AddHours(12); $hot = 0
while ((Get-Date) -lt $end) {
  $ps = [Diagnostics.Process]::GetProcesses(); $node = 0; $pw = 0
  foreach ($p in $ps) { if ($p.ProcessName -eq 'node') { $node++ } elseif ($p.ProcessName -eq 'powershell') { $pw++ } }
  $f = [int]$free.NextValue(); $u = [int]$cpu.NextValue()
  $sw.WriteLine(('{0} free={1} cpu={2}% procs={3} node={4} ps={5}' -f (Get-Date).ToString('HH:mm:ss'), $f, $u, $ps.Count, $node, $pw))
  if ($u -ge 97) { $hot++ } else { $hot = 0 }
  if ($f -lt 2500 -or $node -gt 60 -or $pw -gt 40 -or $hot -ge 15) {
    $k = @(); try { Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -or $_.Name -eq 'powershell.exe') -and $_.ProcessId -ne $PID -and ([string]$_.CommandLine) -match 'tcb-build' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; $k += $_.ProcessId } catch {} } } catch {}
    $sw.WriteLine(('{0} GOVERNOR free={1} node={2} ps={3} stopped={4}' -f (Get-Date).ToString('HH:mm:ss'), $f, $node, $pw, ($k -join ' '))); $hot = 0
  }
  foreach ($p in $ps) { $p.Dispose() }; Start-Sleep -Seconds 2
}
