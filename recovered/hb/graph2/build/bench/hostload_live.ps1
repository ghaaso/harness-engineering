# Host CPU timeline for the interleaved engine bench (protocol addendum 5, section C).
# One long-lived process. Every IntervalSeconds it appends one JSON line to <Out>:
#   t0, t1        the sample window (UTC, milliseconds), from the performance counter timestamps
#   ncpu          logical CPUs of the host
#   total_cpus    host CPU in use over the window, in CPUs (Processor(_Total) x ncpu / 100)
#   vm_cpus       CPU of the Docker/WSL virtual machine processes (vmmem*, vmwp*), in CPUs
#   other_cpus    total_cpus - vm_cpus: every host process outside the virtual machine, in CPUs
#   top           every TopEvery samples: the five busiest host processes outside the VM over the
#                 last TopEvery samples (CPUs), from Get-Process CPU-time deltas
# The counters are read by one continuous Get-Counter query (cheap), so the sampler itself costs little.
# Processor(_Total) is used instead of summing processes, so a process started after the sampler is
# still counted. The bench container works out "other work inside the VM" itself (/proc/stat minus its
# own cgroup), so other_cpus here never includes the bench.
# It stops when StopFile exists, or when HeartbeatFile exists and is older than StaleMinutes, or when
# HeartbeatFile does not exist StaleMinutes after the sampler started (an interrupted run leaves no
# sampler behind).
#   powershell -NoProfile -ExecutionPolicy Bypass -File hostload_live.ps1 <Out> <StopFile> <HeartbeatFile> [IntervalSeconds] [StaleMinutes]
param([string]$Out, [string]$StopFile, [string]$HeartbeatFile, [int]$Interval = 1, [int]$StaleMinutes = 30, [int]$TopEvery = 30)
$ncpu = [Environment]::ProcessorCount
$enc = New-Object System.Text.UTF8Encoding($false)
$started = Get-Date
$script:prevT = $null; $script:k = 0; $script:snap = $null
function Snap { $h = @{}; foreach ($p in (Get-Process -ErrorAction SilentlyContinue)) { try { if ($p.Name -notlike 'vmmem*' -and $p.Name -notlike 'vmwp*' -and $p.Name -ne 'Idle') { $h["$($p.Name)#$($p.Id)"] = $p.TotalProcessorTime.TotalSeconds } } catch { } }; return @{ at = Get-Date; cpu = $h } }
$script:snap = Snap
$paths = @('\Processor(_Total)\% Processor Time', '\Process(vmmem*)\% Processor Time', '\Process(vmwp*)\% Processor Time')
Get-Counter -Counter $paths -SampleInterval $Interval -Continuous -ErrorAction SilentlyContinue | ForEach-Object {
  if ($StopFile -ne '' -and (Test-Path $StopFile)) { exit 0 }
  $age = $null
  if ($HeartbeatFile -ne '' -and (Test-Path $HeartbeatFile)) { $age = ((Get-Date) - (Get-Item $HeartbeatFile).LastWriteTime).TotalMinutes }
  elseif (((Get-Date) - $started).TotalMinutes -gt $StaleMinutes) { exit 0 }
  if ($age -ne $null -and $age -gt $StaleMinutes) { exit 0 }
  $t1 = $_.Timestamp.ToUniversalTime()
  $tot = 0.0; $vm = 0.0
  foreach ($c in $_.CounterSamples) {
    if ($c.Path -like '*\processor(_total)\*') { $tot = $c.CookedValue * $ncpu / 100.0 }
    else { $vm += $c.CookedValue / 100.0 }
  }
  $o = [ordered]@{ t0 = $(if ($script:prevT) { $script:prevT.ToString('yyyy-MM-ddTHH:mm:ss.fffZ') } else { $t1.AddSeconds(-$Interval).ToString('yyyy-MM-ddTHH:mm:ss.fffZ') }); t1 = $t1.ToString('yyyy-MM-ddTHH:mm:ss.fffZ'); ncpu = $ncpu; total_cpus = [math]::Round($tot, 3); vm_cpus = [math]::Round($vm, 3); other_cpus = [math]::Round([math]::Max([double]0.0, [double]($tot - $vm)), 3) }
  $script:prevT = $t1; $script:k++
  if ($script:k % $TopEvery -eq 0) {
    $n = Snap; $dt = ($n.at - $script:snap.at).TotalSeconds; $list = @()
    if ($dt -gt 0) { foreach ($key in $n.cpu.Keys) { $p0 = $script:snap.cpu[$key]; if ($p0 -ne $null) { $d = ($n.cpu[$key] - $p0) / $dt; if ($d -ge 0.05) { $list += [pscustomobject]@{ p = ($key -split '#')[0]; cpus = [math]::Round($d, 2) } } } } }
    $o.top = @($list | Sort-Object cpus -Descending | Select-Object -First 5)
    $o.top_window_s = [math]::Round($dt, 1)
    $script:snap = $n
  }
  [System.IO.File]::AppendAllText($Out, (($o | ConvertTo-Json -Compress -Depth 4) + "`n"), $enc)
}
