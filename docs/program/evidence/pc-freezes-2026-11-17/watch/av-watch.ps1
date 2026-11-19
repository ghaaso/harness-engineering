# av-watch.ps1 - one long-lived Windows PowerShell 5.1 process that writes one line per period, flushed to disk,
# so that the next freeze is on record, and warns before the antivirus service (QHActiveDefense) nears its ceiling.
#
# What it does NOT do: start another PowerShell (no Start-Job, no powershell.exe), use WMI or CIM, use a
# PerformanceCounter, need elevation, or stop/change any process, service or setting. The antivirus is read only
# from the process snapshot that Get-Process also uses ([Diagnostics.Process]::GetProcesses(): private bytes,
# working set, handle count); its process is never opened.
# Free memory and commit come from GlobalMemoryStatusEx, processor time from GetSystemTimes (kernel32, no WMI).
#
# Line (every period):
#   HH:mm:ss lag=<ms> free=<MB> commit=<%> cpu=<%> procs=<n> node=<n> ps=<n> wer=<n> av=<pid>/<privMB>/<wsMB>/<handles> av_vm=<MB> start_ms=<v> file_ms=<v>
#   lag = ms the line is behind its schedule; wer = WerFault/WerFaultSecure processes (crash reporting running).
#   av=none (or none(<pid>:exited) when only an exited QHActiveDefense is still listed) and av_vm=- when the service is
#   not running; "+<n>more" after av when more than one live QHActiveDefense exists; av_vm is its virtual size.
#   <v> = milliseconds of the probe that finished since the previous line, "-" when none has finished yet, BLOCKED:<s> when the previous probe of that kind is still running after
#   <s> seconds (no new one is started), ERR:<type> when it failed.
# Event lines start with "EVENT:" and end with t=HH:mm:ss: START, STOP, AV-RESTART, AV-GONE, AV-PROCS (the set of
# QHActiveDefense processes changed), AV-WARN (private >= -WarnMb or virtual >= -WarnVmMb, at most once a minute;
# also writes AV-WARNING.txt), BLOCK/UNBLOCK start|file, LATE, ERROR.
#
# Ends when -Hours are over or when av-watch.stop exists beside the log. A copy that finds the log's lock held
# by a live copy exits at once (the lock is an open file handle, so Windows releases it when the holder dies).
#
# Test hooks: -StartProbeExe/-StartProbeArgs replace "cmd.exe /c exit" (for example ping.exe "-n 25 127.0.0.1"
# for a slow probe); -FileProbeDelaySeconds makes the file probe thread sleep after its work (a slow file probe);
# -AvName watches another process name in place of QHActiveDefense (to test AV-GONE / AV-RESTART / AV-PROCS).
param(
  [Parameter(Mandatory = $true)][string]$Log,
  [int]$PeriodSeconds = 5,
  [double]$Hours = 24,
  [int]$WarnMb = 1000,
  [int]$WarnVmMb = 1700,
  [string]$StartProbeExe = (Join-Path $env:SystemRoot 'System32\cmd.exe'),
  [string]$StartProbeArgs = '/c exit',
  [int]$FileProbeDelaySeconds = 0,
  [string]$AvName = 'QHActiveDefense'
)
# No "exit" anywhere: "return" is safe whether this runs with -File or as a script block inside another host.

$Log = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Log)
$dir = [IO.Path]::GetDirectoryName($Log)
if (-not [IO.Directory]::Exists($dir)) { [void][IO.Directory]::CreateDirectory($dir) }
if ($PeriodSeconds -lt 1) { $PeriodSeconds = 1 }

# ---- lock: hold <log>.lock open for writing for the whole run; a second opener gets a sharing violation ----
$lockPath = $Log + '.lock'
$lock = $null
try {
  $lock = New-Object IO.FileStream($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::Read)
} catch {
  $holder = '?'
  try {
    $r = New-Object IO.StreamReader((New-Object IO.FileStream($lockPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)))
    $holder = $r.ReadToEnd().Trim(); $r.Dispose()
  } catch {}
  Write-Output ('av-watch: another live copy (pid {0}) already writes {1}; this copy (pid {2}) exits.' -f $holder, $Log, $PID)
  return
}
$lock.SetLength(0)
$b = [Text.Encoding]::ASCII.GetBytes("$PID`r`n"); $lock.Write($b, 0, $b.Length); $lock.Flush()

$src = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
namespace AvWatch {
  public static class Sys {
    [StructLayout(LayoutKind.Sequential)]
    private class MemStatus {
      public uint dwLength; public uint dwMemoryLoad;
      public ulong ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile, ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual;
      public MemStatus() { dwLength = (uint)Marshal.SizeOf(typeof(MemStatus)); }
    }
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GlobalMemoryStatusEx([In, Out] MemStatus m);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GetSystemTimes(out long idle, out long kernel, out long user);
    // {available physical, commit limit, commit available} in bytes, or null
    public static ulong[] Mem() {
      var m = new MemStatus();
      if (!GlobalMemoryStatusEx(m)) return null;
      return new ulong[] { m.ullAvailPhys, m.ullTotalPageFile, m.ullAvailPageFile };
    }
    private static long pIdle = -1, pKernel, pUser;
    // processor busy % since the previous call (kernel time includes idle time), -1 on the first call or failure
    public static int Cpu() {
      long i, k, u;
      if (!GetSystemTimes(out i, out k, out u)) return -1;
      int r = -1;
      if (pIdle >= 0) {
        long total = (k - pKernel) + (u - pUser), idle = i - pIdle;
        if (total > 0) r = (int)Math.Round(100.0 * (total - idle) / total);
      }
      pIdle = i; pKernel = k; pUser = u;
      return r;
    }
  }
  public class Probe {
    private readonly object g = new object();
    private bool running, fresh;
    private long startTs;
    private string result = "-";
    private double lastSeconds;
    public string Kind, Exe, Args, Dir;
    public int DelayMs;
    public Probe(string kind) { Kind = kind; }
    public bool Running { get { lock (g) return running; } }
    public double RunningSeconds { get { lock (g) return running ? (Stopwatch.GetTimestamp() - startTs) / (double)Stopwatch.Frequency : 0.0; } }
    public double LastSeconds { get { lock (g) return lastSeconds; } }
    // the result of a probe that finished since the last call, or null
    public string TakeResult() { lock (g) { if (!fresh) return null; fresh = false; return result; } }
    public bool Begin() {
      lock (g) { if (running) return false; running = true; startTs = Stopwatch.GetTimestamp(); }
      var t = new Thread(Run); t.IsBackground = true; t.Name = "av-watch-" + Kind; t.Start();
      return true;
    }
    private void Run() {
      string r;
      var sw = Stopwatch.StartNew();
      try {
        if (Kind == "start") DoStart(); else DoFile();
        if (DelayMs > 0) Thread.Sleep(DelayMs);
        r = sw.ElapsedMilliseconds.ToString();
      } catch (Exception e) { r = "ERR:" + e.GetType().Name; }
      lock (g) { result = r; fresh = true; running = false; lastSeconds = sw.Elapsed.TotalSeconds; }
    }
    private void DoStart() {
      var psi = new ProcessStartInfo(Exe, Args);
      psi.UseShellExecute = false; psi.CreateNoWindow = true; psi.WindowStyle = ProcessWindowStyle.Hidden;
      using (var p = Process.Start(psi)) { p.WaitForExit(); }
    }
    private void DoFile() {
      string f = Path.Combine(Dir, "p" + Stopwatch.GetTimestamp().ToString() + ".tmp");
      var buf = new byte[1024];
      for (int i = 0; i < buf.Length; i++) buf[i] = (byte)(i & 0xFF);
      using (var s = new FileStream(f, FileMode.CreateNew, FileAccess.Write, FileShare.None)) { s.Write(buf, 0, buf.Length); }
      using (var s = new FileStream(f, FileMode.Open, FileAccess.Read, FileShare.None)) {
        int n = 0; while (n < buf.Length) { int k = s.Read(buf, n, buf.Length - n); if (k <= 0) break; n += k; }
      }
      File.Delete(f);
    }
  }
}
'@

$fs = $null; $sw = $null
try {
  $fs = New-Object IO.FileStream($Log, [IO.FileMode]::Append, [IO.FileAccess]::Write, [IO.FileShare]::ReadWrite, 4096, [IO.FileOptions]::WriteThrough)
  $sw = New-Object IO.StreamWriter($fs); $sw.AutoFlush = $true
  $now = { (Get-Date).ToString('HH:mm:ss') }
  function Ev([string]$s) { $sw.WriteLine(('EVENT: {0} t={1}' -f $s, (& $now))) }

  if (-not ('AvWatch.Probe' -as [type])) { Add-Type -TypeDefinition $src -Language CSharp }

  $stopPath = Join-Path $dir 'av-watch.stop'
  $warnPath = Join-Path $dir 'AV-WARNING.txt'
  $probeDir = Join-Path $dir 'av-watch-probe'
  if (-not [IO.Directory]::Exists($probeDir)) { [void][IO.Directory]::CreateDirectory($probeDir) }
  foreach ($old in [IO.Directory]::GetFiles($probeDir, 'p*.tmp')) { try { [IO.File]::Delete($old) } catch {} }
  if ([IO.File]::Exists($stopPath)) { [IO.File]::Delete($stopPath); Ev 'STALE-STOP-FILE removed at start' }

  $pStart = New-Object AvWatch.Probe('start'); $pStart.Exe = $StartProbeExe; $pStart.Args = $StartProbeArgs
  $pFile = New-Object AvWatch.Probe('file'); $pFile.Dir = $probeDir; $pFile.DelayMs = 1000 * $FileProbeDelaySeconds
  $probes = @{ start = $pStart; file = $pFile }
  $blockNext = @{ start = 15; file = 15 }
  $blockSeen = @{ start = $false; file = $false }
  [void][AvWatch.Sys]::Cpu()

  Ev ('START pid={0} period={1}s hours={2} warn_mb={3} start_probe="{4} {5}" file_probe_delay={6}s av_name={7} warn_vm_mb={8} log={9}' -f $PID, $PeriodSeconds, $Hours, $WarnMb, $StartProbeExe, $StartProbeArgs, $FileProbeDelaySeconds, $AvName, $WarnVmMb, $Log)

  $endAt = (Get-Date).AddHours($Hours)
  $clock = [Diagnostics.Stopwatch]::StartNew()
  $periodMs = 1000 * $PeriodSeconds
  $tick = 0
  $avPid = $null; $avGone = $false; $lastWarn = $null; $avSigLast = $null
  $reason = 'hours'

  while ($true) {
    $due = [long]$tick * $periodMs
    $wait = $due - $clock.ElapsedMilliseconds
    if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
    if ([IO.File]::Exists($stopPath)) { $reason = 'stop-file'; break }
    if ((Get-Date) -ge $endAt) { break }
    $lag = $clock.ElapsedMilliseconds - $due
    $events = New-Object Collections.Generic.List[string]
    try {
      $m = [AvWatch.Sys]::Mem()
      if ($null -ne $m) { $free = [long]($m[0] / 1MB); $commit = [int](100.0 * ($m[1] - $m[2]) / $m[1]) } else { $free = '?'; $commit = '?' }
      $cpu = [AvWatch.Sys]::Cpu()

      $ps = [Diagnostics.Process]::GetProcesses()
      $node = 0; $pw = 0; $wer = 0; $av = $null; $avN = 0; $avSig = New-Object Collections.Generic.List[string]
      foreach ($p in $ps) {
        $n = $p.ProcessName
        if ($n -eq 'node') { $node++ }
        elseif ($n -eq 'powershell') { $pw++ }
        elseif ($n -eq 'WerFault' -or $n -eq 'WerFaultSecure') { $wer++ }
        elseif ($n -eq $AvName) {
          # an exited process that something still holds open (for example while WerFault writes its report) stays
          # listed with no threads and no handles; it is not a running service
          if ($p.Threads.Count -eq 0 -or $p.HandleCount -eq 0) { $avSig.Add('' + $p.Id + ':exited'); continue }
          $avSig.Add('' + $p.Id)
          $avN++
          if ($null -eq $av -or $p.PrivateMemorySize64 -gt $av.Priv) {
            $av = @{ Id = $p.Id; Priv = $p.PrivateMemorySize64; Ws = $p.WorkingSet64; H = $p.HandleCount; Vm = $p.VirtualMemorySize64 }
          }
        }
      }
      $procCount = $ps.Count
      foreach ($p in $ps) { $p.Dispose() }
      $avSig.Sort(); $sig = ($avSig -join ','); if ($sig -eq '') { $sig = '-' }
      if ($null -ne $avSigLast -and $sig -ne $avSigLast) { $events.Add(('AV-PROCS now={0} was={1}' -f $sig, $avSigLast)) }
      $avSigLast = $sig

      if ($null -eq $av) {
        $avField = 'none'; $vmField = '-'; if ($sig -ne '-') { $avField = 'none(' + $sig + ')' }
        if ($null -ne $avPid -and -not $avGone) { $events.Add(('AV-GONE last={0}' -f $avPid)); $avGone = $true }
      } else {
        $privMb = [long]($av.Priv / 1MB)
        $avField = '{0}/{1}/{2}/{3}' -f $av.Id, $privMb, [long]($av.Ws / 1MB), $av.H
        if ($avN -gt 1) { $avField += ('+{0}more' -f ($avN - 1)) }
        $vmField = [long]($av.Vm / 1MB)
        if ($null -ne $avPid -and $av.Id -ne $avPid) { $events.Add(('AV-RESTART old={0} new={1}' -f $avPid, $av.Id)) }
        $avPid = $av.Id; $avGone = $false
        $on = $null; if ($privMb -ge $WarnMb) { $on = 'priv' } elseif ($vmField -ge $WarnVmMb) { $on = 'vm' }
        if ($null -ne $on -and ($null -eq $lastWarn -or ((Get-Date) - $lastWarn).TotalSeconds -ge 60)) {
          $lastWarn = Get-Date
          $events.Add(('AV-WARN priv={0} ws={1} handles={2} vm={3} pid={4} on={5} warn_mb={6} warn_vm_mb={7}' -f $privMb, [long]($av.Ws / 1MB), $av.H, $vmField, $av.Id, $on, $WarnMb, $WarnVmMb))
          $txt = ('At {0} the antivirus service (360 Total Security, QHActiveDefense, pid {1}) held {2} MB of private memory and {3} MB of virtual size, at or above a warning level ({4} MB private or {5} MB virtual); it is a 32-bit program (about 2 GB of address space), and on 2026-11-17 its working set reached about 1,590 MB just before one of its terminations, and the PC froze minutes later.' -f $lastWarn.ToString('yyyy-MM-dd HH:mm:ss'), $av.Id, $privMb, $vmField, $WarnMb, $WarnVmMb) + "`r`n" +
                 'Stop starting PowerShell now: no PowerShell tool calls, and no scripts or tests that start powershell.exe.' + "`r`n" +
                 'Restart the PC at the next convenient point; nothing is lost, because the runs are restartable and resume from their files.' + "`r`n"
          try { [IO.File]::WriteAllText($warnPath, $txt) } catch { $events.Add('WARN-FILE-FAILED ' + $_.Exception.GetType().Name) }
        }
      }

      $vals = @{}
      foreach ($k in @('start', 'file')) {
        $pr = $probes[$k]
        if ($pr.Running) {
          $s = [int][Math]::Floor($pr.RunningSeconds)
          if ($s -ge $blockNext[$k]) {
            $events.Add(('BLOCK {0} since={1}s' -f $k, $s)); $blockSeen[$k] = $true
            $blockNext[$k] = ([Math]::Floor($s / 15) + 1) * 15
          }
          $vals[$k] = 'BLOCKED:' + $s
        } else {
          $r = $pr.TakeResult(); if ($null -eq $r) { $r = '-' }
          if ($blockSeen[$k]) { $events.Add(('UNBLOCK {0} after {1:0.0}s' -f $k, $pr.LastSeconds)); $blockSeen[$k] = $false }
          $blockNext[$k] = 15
          $vals[$k] = $r
          [void]$pr.Begin()
        }
      }

      $sw.WriteLine(('{0} lag={1} free={2} commit={3} cpu={4} procs={5} node={6} ps={7} wer={8} av={9} av_vm={10} start_ms={11} file_ms={12}' -f (& $now), $lag, $free, $commit, $cpu, $procCount, $node, $pw, $wer, $avField, $vmField, $vals['start'], $vals['file']))
      foreach ($e in $events) { Ev $e }
    } catch {
      try { Ev ('ERROR ' + $_.Exception.GetType().Name + ': ' + ($_.Exception.Message -replace '\s+', ' ')) } catch {}
    }
    $tick++
    $nextDue = [long]$tick * $periodMs
    if ($clock.ElapsedMilliseconds -gt $nextDue + $periodMs) {
      $skip = [long][Math]::Floor(($clock.ElapsedMilliseconds - $nextDue) / $periodMs)
      $tick += $skip
      try { Ev ('LATE skipped={0} periods' -f $skip) } catch {}
    }
  }
  Ev ('STOP reason={0} pid={1}' -f $reason, $PID)
  if ($reason -eq 'stop-file') { try { [IO.File]::Delete($stopPath) } catch {} }
} finally {
  if ($null -ne $sw) { try { $sw.Dispose() } catch {} }
  if ($null -ne $fs) { try { $fs.Dispose() } catch {} }
  if ($null -ne $lock) {
    try { $lock.Dispose() } catch {}
    # the antivirus can hold a just-closed file for a moment; a lock file left behind is harmless (nobody holds it)
    for ($i = 0; $i -lt 10; $i++) { try { [IO.File]::Delete($lockPath); break } catch { Start-Sleep -Milliseconds 300 } }
  }
}
