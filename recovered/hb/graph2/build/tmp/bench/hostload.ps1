# Host CPU sampler for the measurement lane. One process, one sample per interval, appended as JSON
# lines: total host CPU (% of all logical CPUs), the Docker/WSL virtual machine's share, and the CPU of
# every other host process (in % of ONE logical CPU), with the top five.
#   powershell -NoProfile -File hostload.ps1 <outfile> [intervalSeconds] [count]
param([string]$Out, [int]$Interval = 30, [int]$Count = 0, [string]$StopFile = '')
$n = 0
while ($Count -eq 0 -or $n -lt $Count) {
  if ($StopFile -ne '' -and (Test-Path $StopFile)) { break }
  try {
    $s = (Get-Counter '\Process(*)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples
    $tot = (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples[0].CookedValue
    $vm = 0.0; $other = 0.0; $list = @()
    foreach ($c in $s) {
      $name = $c.InstanceName
      if ($name -eq '_total' -or $name -eq 'idle') { continue }
      if ($name -like 'vmmem*' -or $name -like 'vmwp*') { $vm += $c.CookedValue; continue }
      $other += $c.CookedValue
      if ($c.CookedValue -ge 5) { $list += [pscustomobject]@{ p = $name; cpu = [math]::Round($c.CookedValue, 1) } }
    }
    $top = $list | Sort-Object cpu -Descending | Select-Object -First 5
    $o = [ordered]@{ at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); host_total_pct_of_all = [math]::Round($tot, 1); vm_pct_of_one = [math]::Round($vm, 1); other_pct_of_one = [math]::Round($other, 1); top_other = $top }
    ($o | ConvertTo-Json -Compress -Depth 4) | Out-File -FilePath $Out -Append -Encoding utf8
  } catch { }
  $n++
  if ($Count -eq 0 -or $n -lt $Count) { Start-Sleep -Seconds $Interval }
}
