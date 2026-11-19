# pc-watch.ps1 - one long-lived Windows PowerShell 5.1 process that writes one line per period, flushed to disk,
# so that the next blocked program start is on record, and shows WHERE a start is stuck without starting anything.
# Built from av-watch.ps1 (2026-11-17); everything that one guarantees still holds.
#
# What it does NOT do: start another PowerShell (no Start-Job, no powershell.exe), use WMI or CIM, use a
# PerformanceCounter, need elevation, open another process, or stop/change any process, service or setting.
# All process and thread data come from one NtQuerySystemInformation(SystemProcessInformation) call per period
# (the same system snapshot Get-Process reads; it opens no process and needs no rights). Free memory and commit
# come from GlobalMemoryStatusEx, processor time from GetSystemTimes (kernel32). The only programs it starts are
# its start probe (cmd.exe /c exit by default) and, once at start, the C# compiler run by Add-Type.
#
# Line (every period):
#   HH:mm:ss lag=<ms> free=<MB> commit=<%> cpu=<%> procs=<n> thr=<n> hdl=<n> node=<n> ps=<n> wer=<n> [av=<pid>/<privMB>/<wsMB>/<handles> av_vm=<MB>] start_ms=<v> file_ms=<v>
#   lag = ms the line is behind its schedule; thr/hdl = threads and handles of all programs; wer = WerFault and
#   WerFaultSecure programs; av fields only with -WatchName (see below). <v> = ms of the probe that finished since
#   the previous line, "-" when none finished, BLOCKED:<s> while the running probe of that kind has run <s> s
#   (no new one is started), ERR:<type> when it failed.
# NEW line (after the period line, only when programs appeared since the previous period):
#   NEW: <name>:<pid><<parent pid>:<parent name> ...  [+<n> more]      at most 30 entries, oldest first;
#   parent name "?" = parent not listed (exited, or its id was reused). The watcher's own probes and their
#   children are left out. Programs that start and end between two periods are not seen.
# Event lines start with "EVENT:" and end with t=HH:mm:ss: START, STOP, BLOCK/UNBLOCK start|file, SLOW (a start
# probe over -SlowMs that was not blocked, at most once a minute), SNAPSHOT-COST, SNAPSHOT-SKIPPED, SNAP-ERROR,
# LATE, ERROR, STALE-STOP-FILE; with -WatchName also AV-RESTART, AV-GONE, AV-PROCS, AV-WARN (writes
# WATCH-WARNING.txt).
# Snapshot block (start probe BLOCKED for 15 s, again at 60 s into the same block, and at its UNBLOCK; at most
# -MaxSnapshotsPerHour, at most 250 lines, built from the period's own system snapshot):
#   SNAPSHOT begin reason=block15|block60|unblock t=HH:mm:ss <probe phase> query_ms=<n>
#   self ... / "  self tid=<tid> <state>[/<wait reason>] [main] [probe-start(...)] [probe-file]"   (a)
#   probe start phase=<begin|in-start|wait-exit|done|error> ... / "  child <name>:<pid> ..."           (b)
#   recent <name>:<pid> parent=<ppid>:<pname> age=<s>s thr=<n> first=<tid:state,...>                (c)
#   sys <name> n=<count> thr=<n> <state>=<count> ...                                                   (d)
#   totals procs=<n> thr=<n> hdl=<n> commit=<%> free=<MB>                                              (e)
#   SNAPSHOT end lines=<n> build_ms=<n> recent=<shown>/<total>
#   Probe phase "in-start" means Process.Start (CreateProcess) has not returned; "wait-exit" means the program
#   was created and the probe waits for it to end.
#
# -WatchName <process name> (default empty): adds the av fields for that name (largest live instance), the AV-*
# events and the warning file (private >= -WarnMb or virtual >= -WarnVmMb, at most once a minute). Empty: none of it.
# Ends when -Hours are over or when pc-watch.stop exists beside the log. A copy that finds the log's lock held by a
# live copy exits at once (the lock is an open file handle, so Windows releases it when the holder dies).
#
# Test hooks: -StartProbeExe/-StartProbeArgs replace "cmd.exe /c exit" (for example ping.exe "-n 40 127.0.0.1"
# for a blocked probe, "-n 4 127.0.0.1" for a slow one); -FileProbeDelaySeconds makes the file probe thread sleep
# after its work.
param(
  [Parameter(Mandatory = $true)][string]$Log,
  [int]$PeriodSeconds = 5,
  [double]$Hours = 24,
  [string]$WatchName = '',
  [int]$WarnMb = 1000,
  [int]$WarnVmMb = 1700,
  [int]$SlowMs = 2000,
  [int]$MaxSnapshotsPerHour = 12,
  [string]$StartProbeExe = (Join-Path $env:SystemRoot 'System32\cmd.exe'),
  [string]$StartProbeArgs = '/c exit',
  [int]$FileProbeDelaySeconds = 0
)
# No "exit" anywhere: "return" is safe whether this runs with -File or as a script block inside another host.

$Log = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Log)
$dir = [IO.Path]::GetDirectoryName($Log)
if (-not [IO.Directory]::Exists($dir)) { [void][IO.Directory]::CreateDirectory($dir) }
if ($PeriodSeconds -lt 1) { $PeriodSeconds = 1 }
if ($null -eq $WatchName) { $WatchName = '' }
$WatchName = $WatchName.Trim()

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
  Write-Output ('pc-watch: another live copy (pid {0}) already writes {1}; this copy (pid {2}) exits.' -f $holder, $Log, $PID)
  return
}
$lock.SetLength(0)
$b = [Text.Encoding]::ASCII.GetBytes("$PID`r`n"); $lock.Write($b, 0, $b.Length); $lock.Flush()

$src = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
namespace PcWatch {
  public static class Sys {
    [StructLayout(LayoutKind.Sequential)]
    private class MemStatus {
      public uint dwLength; public uint dwMemoryLoad;
      public ulong ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile, ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual;
      public MemStatus() { dwLength = (uint)Marshal.SizeOf(typeof(MemStatus)); }
    }
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GlobalMemoryStatusEx([In, Out] MemStatus m);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GetSystemTimes(out long idle, out long kernel, out long user);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
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
    private long startTs, phaseTs;
    private string result = "-", phase = "idle";
    private double lastSeconds;
    private long lastCreateMs = -1;
    private int childPid = -1, osTid = 0;
    public string Kind, Exe, Args, Dir;
    public int DelayMs;
    public Probe(string kind) { Kind = kind; phaseTs = Stopwatch.GetTimestamp(); }
    private static double Secs(long ticks) { return ticks / (double)Stopwatch.Frequency; }
    public bool Running { get { lock (g) return running; } }
    public double RunningSeconds { get { lock (g) return running ? Secs(Stopwatch.GetTimestamp() - startTs) : 0.0; } }
    public double LastSeconds { get { lock (g) return lastSeconds; } }
    public long LastCreateMs { get { lock (g) return lastCreateMs; } }
    public int ChildPid { get { lock (g) return childPid; } }
    public int OsTid { get { lock (g) return osTid; } }
    public string Phase { get { lock (g) return phase; } }
    public string ExeName { get { try { return Path.GetFileName(Exe); } catch { return "?"; } } }
    // phase=<p> phase_s=<s> run_s=<s> child=<pid|-> create_ms=<ms|-> tid=<os thread id>
    public string PhaseText() {
      lock (g) {
        long now = Stopwatch.GetTimestamp();
        var ci = CultureInfo.InvariantCulture;
        string s = "phase=" + phase + " phase_s=" + Secs(now - phaseTs).ToString("0.0", ci);
        s += running ? " run_s=" + Secs(now - startTs).ToString("0.0", ci) : " last_s=" + lastSeconds.ToString("0.0", ci);
        s += " child=" + (childPid > 0 ? childPid.ToString(ci) : "-");
        s += " create_ms=" + (lastCreateMs >= 0 ? lastCreateMs.ToString(ci) : "-");
        s += " tid=" + osTid.ToString(ci);
        return s;
      }
    }
    private void SetPhase(string p) { lock (g) { phase = p; phaseTs = Stopwatch.GetTimestamp(); } }
    // the result of a probe that finished since the last call, or null
    public string TakeResult() { lock (g) { if (!fresh) return null; fresh = false; return result; } }
    public bool Begin() {
      lock (g) {
        if (running) return false;
        running = true; startTs = Stopwatch.GetTimestamp(); phase = "begin"; phaseTs = startTs;
        osTid = 0; childPid = -1; lastCreateMs = -1;
      }
      var t = new Thread(Run); t.IsBackground = true; t.Name = "pc-watch-" + Kind; t.Start();
      return true;
    }
    private void Run() {
      lock (g) osTid = (int)Sys.GetCurrentThreadId();
      string r;
      var sw = Stopwatch.StartNew();
      try {
        if (Kind == "start") DoStart(); else DoFile();
        if (DelayMs > 0) Thread.Sleep(DelayMs);
        r = sw.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture);
        SetPhase("done");
      } catch (Exception e) { r = "ERR:" + e.GetType().Name; SetPhase("error"); }
      lock (g) { result = r; fresh = true; running = false; lastSeconds = sw.Elapsed.TotalSeconds; }
    }
    private void DoStart() {
      var psi = new ProcessStartInfo(Exe, Args);
      psi.UseShellExecute = false; psi.CreateNoWindow = true; psi.WindowStyle = ProcessWindowStyle.Hidden;
      SetPhase("in-start");
      var sw = Stopwatch.StartNew();
      using (var p = Process.Start(psi)) {
        long cm = sw.ElapsedMilliseconds; int id = -1;
        try { id = p.Id; } catch { }
        lock (g) { lastCreateMs = cm; childPid = id; phase = "wait-exit"; phaseTs = Stopwatch.GetTimestamp(); }
        p.WaitForExit();
      }
    }
    private void DoFile() {
      SetPhase("file");
      string f = Path.Combine(Dir, "p" + Stopwatch.GetTimestamp().ToString(CultureInfo.InvariantCulture) + ".tmp");
      var buf = new byte[1024];
      for (int i = 0; i < buf.Length; i++) buf[i] = (byte)(i & 0xFF);
      using (var s = new FileStream(f, FileMode.CreateNew, FileAccess.Write, FileShare.None)) { s.Write(buf, 0, buf.Length); }
      using (var s = new FileStream(f, FileMode.Open, FileAccess.Read, FileShare.None)) {
        int n = 0; while (n < buf.Length) { int k = s.Read(buf, n, buf.Length - n); if (k <= 0) break; n += k; }
      }
      File.Delete(f);
    }
  }

  // SYSTEM_PROCESS_INFORMATION and SYSTEM_THREAD_INFORMATION as winternl.h / the NT headers lay them out
  // (sequential, natural alignment: 256 and 80 bytes on 64-bit Windows).
  [StructLayout(LayoutKind.Sequential)]
  internal struct SPI {
    public uint NextEntryOffset; public uint NumberOfThreads;
    public long WorkingSetPrivateSize; public uint HardFaultCount; public uint NumberOfThreadsHighWatermark;
    public ulong CycleTime; public long CreateTime; public long UserTime; public long KernelTime;
    public ushort NameLength; public ushort NameMaximumLength; public IntPtr NameBuffer;
    public int BasePriority; public IntPtr UniqueProcessId; public IntPtr InheritedFromUniqueProcessId;
    public uint HandleCount; public uint SessionId; public UIntPtr UniqueProcessKey;
    public UIntPtr PeakVirtualSize; public UIntPtr VirtualSize; public uint PageFaultCount;
    public UIntPtr PeakWorkingSetSize; public UIntPtr WorkingSetSize;
    public UIntPtr QuotaPeakPagedPoolUsage; public UIntPtr QuotaPagedPoolUsage;
    public UIntPtr QuotaPeakNonPagedPoolUsage; public UIntPtr QuotaNonPagedPoolUsage;
    public UIntPtr PagefileUsage; public UIntPtr PeakPagefileUsage; public UIntPtr PrivatePageCount;
    public long ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount;
  }
  [StructLayout(LayoutKind.Sequential)]
  internal struct STI {
    public long KernelTime, UserTime, CreateTime; public uint WaitTime; public IntPtr StartAddress;
    public IntPtr UniqueProcess; public IntPtr UniqueThread; public int Priority; public int BasePriority;
    public uint ContextSwitches; public uint ThreadState; public uint WaitReason;
  }

  public class Proc {
    public int Pid, Ppid, Threads, Handles; public string Name; public long Create;
    public long Priv, Ws, Vm; internal long ThreadOffset;
  }
  public class Thr { public int Tid; public uint State, Wait; }

  public class Snap {
    [DllImport("ntdll.dll")] private static extern int NtQuerySystemInformation(int cls, IntPtr buf, int len, out int ret);
    public static readonly int SpiSize = Marshal.SizeOf(typeof(SPI));
    public static readonly int StiSize = Marshal.SizeOf(typeof(STI));
    private IntPtr buf = IntPtr.Zero; private int bufLen = 0, validLen = 0;
    public List<Proc> Procs = new List<Proc>();
    public Dictionary<int, Proc> ById = new Dictionary<int, Proc>();
    private Dictionary<int, long> prev = null;   // pid -> create time, previous good snapshot
    public long TakenFt; public long QueryMs; public long ThreadTotal, HandleTotal; public string Error;
    public long LastBuildMs;

    private static readonly string[] States = { "Init", "Ready", "Run", "Standby", "Term", "Wait", "Trans", "DefReady", "GateWait", "WaitSwap" };
    private static readonly string[] Waits = { "Executive", "FreePage", "PageIn", "PoolAlloc", "Delay", "Suspended", "UserRequest",
      "WrExecutive", "WrFreePage", "WrPageIn", "WrPoolAlloc", "WrDelay", "WrSuspended", "WrUserRequest", "WrSpare0", "WrQueue",
      "WrLpcReceive", "WrLpcReply", "WrVirtualMemory", "WrPageOut", "WrRendezvous", "WrKeyedEvent", "WrTerminated",
      "WrProcessInSwap", "WrCpuRateControl", "WrCalloutStack", "WrKernel", "WrResource", "WrPushLock", "WrMutex",
      "WrQuantumEnd", "WrDispatchInt", "WrPreempted", "WrYieldExecution", "WrFastMutex", "WrGuardedMutex", "WrRundown",
      "WrAlertByThreadId", "WrDeferredPreempt", "WrPhysicalFault", "WrIoRing", "WrMdlCache", "WrRcu" };
    public static string StateTok(Thr t) {
      string s = t.State < States.Length ? States[t.State] : "S" + t.State;
      if (t.State == 5 || t.State == 8 || t.State == 9) s += "/" + (t.Wait < Waits.Length ? Waits[t.Wait] : "W" + t.Wait);
      return s;
    }
    public static string Tok(string s) {
      if (string.IsNullOrEmpty(s)) return "?";
      var sb = new StringBuilder(s.Length);
      foreach (char c in s) sb.Append(char.IsWhiteSpace(c) || c == '<' || c == ':' ? '_' : c);
      return sb.ToString();
    }

    public bool Take() {
      var sw = Stopwatch.StartNew();
      Error = null;
      try {
        if (SpiSize != (IntPtr.Size == 8 ? 256 : 184) || StiSize != (IntPtr.Size == 8 ? 80 : 64)) { Error = "layout spi=" + SpiSize + " sti=" + StiSize; return false; }
        if (bufLen == 0) { bufLen = 4 << 20; buf = Marshal.AllocHGlobal(bufLen); }
        int ret = 0, st = 0;
        for (int i = 0; ; i++) {
          st = NtQuerySystemInformation(5, buf, bufLen, out ret);
          if (st == unchecked((int)0xC0000004) && i < 6) {
            int want = Math.Max(ret + (1 << 20), bufLen * 2);
            Marshal.FreeHGlobal(buf); buf = IntPtr.Zero; bufLen = 0;
            buf = Marshal.AllocHGlobal(want); bufLen = want;
            continue;
          }
          break;
        }
        if (st != 0) { Error = "ntstatus=0x" + st.ToString("X8"); return false; }
        validLen = ret > 0 && ret <= bufLen ? ret : bufLen;
        TakenFt = DateTime.UtcNow.ToFileTimeUtc();
        var list = new List<Proc>(512); var map = new Dictionary<int, Proc>(512);
        long thr = 0, hdl = 0, off = 0, b0 = buf.ToInt64();
        while (off + SpiSize <= validLen) {
          SPI s = (SPI)Marshal.PtrToStructure(new IntPtr(b0 + off), typeof(SPI));
          var p = new Proc();
          p.Pid = (int)s.UniqueProcessId.ToInt64(); p.Ppid = (int)s.InheritedFromUniqueProcessId.ToInt64();
          p.Threads = (int)s.NumberOfThreads; p.Handles = (int)s.HandleCount; p.Create = s.CreateTime;
          p.Priv = (long)s.PrivatePageCount.ToUInt64(); p.Ws = (long)s.WorkingSetSize.ToUInt64(); p.Vm = (long)s.VirtualSize.ToUInt64();
          string name = null;
          long nb = s.NameBuffer.ToInt64();
          if (nb != 0 && s.NameLength > 0 && nb >= b0 && nb + s.NameLength <= b0 + validLen) name = Marshal.PtrToStringUni(s.NameBuffer, s.NameLength / 2);
          if (name == null) name = p.Pid == 0 ? "Idle" : "?";
          if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) name = name.Substring(0, name.Length - 4);
          p.Name = name;
          p.ThreadOffset = off + SpiSize;
          list.Add(p); map[p.Pid] = p;
          thr += p.Threads; hdl += p.Handles;
          if (s.NextEntryOffset == 0) break;
          off += s.NextEntryOffset;
        }
        Dictionary<int, long> cur = null;
        if (Procs.Count > 0) { cur = new Dictionary<int, long>(Procs.Count); foreach (var q in Procs) cur[q.Pid] = q.Create; }
        prev = cur;
        Procs = list; ById = map; ThreadTotal = thr; HandleTotal = hdl;
        return true;
      } catch (Exception e) {
        Error = e.GetType().Name; return false;
      } finally { QueryMs = sw.ElapsedMilliseconds; }
    }

    public List<Thr> ThreadsOf(Proc p, int max) {
      var r = new List<Thr>();
      long b0 = buf.ToInt64();
      for (int i = 0; i < p.Threads && i < max; i++) {
        long o = p.ThreadOffset + (long)i * StiSize;
        if (o + StiSize > validLen) break;
        STI t = (STI)Marshal.PtrToStructure(new IntPtr(b0 + o), typeof(STI));
        var x = new Thr(); x.Tid = (int)t.UniqueThread.ToInt64(); x.State = t.ThreadState; x.Wait = t.WaitReason;
        r.Add(x);
      }
      return r;
    }
    public int CountName(string n) { int c = 0; foreach (var p in Procs) if (string.Equals(p.Name, n, StringComparison.OrdinalIgnoreCase)) c++; return c; }
    public List<Proc> Named(string n) { var r = new List<Proc>(); foreach (var p in Procs) if (string.Equals(p.Name, n, StringComparison.OrdinalIgnoreCase)) r.Add(p); return r; }
    public string ParentName(Proc c) {
      Proc pp;
      if (c.Ppid != c.Pid && ById.TryGetValue(c.Ppid, out pp) && pp.Create <= c.Create) return pp.Name;
      return "?";
    }
    // the programs started (directly or further down) by root, as listed now
    public HashSet<int> Descendants(int root) {
      var set = new HashSet<int>(); Proc r;
      if (!ById.TryGetValue(root, out r)) return set;
      var kids = new Dictionary<int, List<Proc>>();
      foreach (var p in Procs) {
        if (p.Pid == 0 || p.Pid == p.Ppid) continue;
        List<Proc> l; if (!kids.TryGetValue(p.Ppid, out l)) { l = new List<Proc>(); kids[p.Ppid] = l; } l.Add(p);
      }
      var q = new Queue<Proc>(); q.Enqueue(r);
      while (q.Count > 0) {
        var x = q.Dequeue(); List<Proc> l;
        if (!kids.TryGetValue(x.Pid, out l)) continue;
        foreach (var c in l) { if (c.Create < x.Create) continue; if (set.Add(c.Pid)) q.Enqueue(c); }
      }
      return set;
    }
    // "NEW: ..." for programs listed now and not in the previous snapshot, or null
    public string NewLine(int selfPid, int max) {
      if (prev == null) return null;
      var desc = Descendants(selfPid);
      var l = new List<Proc>();
      foreach (var p in Procs) {
        long c; if (prev.TryGetValue(p.Pid, out c) && c == p.Create) continue;
        if (p.Pid == selfPid || desc.Contains(p.Pid)) continue;
        l.Add(p);
      }
      if (l.Count == 0) return null;
      l.Sort(delegate (Proc a, Proc b) { return a.Create.CompareTo(b.Create); });
      var sb = new StringBuilder("NEW:");
      for (int i = 0; i < l.Count && i < max; i++) {
        var p = l[i];
        sb.Append(' ').Append(Tok(p.Name)).Append(':').Append(p.Pid).Append('<').Append(p.Ppid).Append(':').Append(Tok(ParentName(p)));
      }
      if (l.Count > max) sb.Append(" +").Append(l.Count - max).Append(" more");
      return sb.ToString();
    }

    private static readonly string[] SysNames = { "csrss", "lsass", "services", "MsMpEng", "NisSrv", "explorer", "conhost", "svchost", "claude" };
    private string Threads(List<Thr> ths, int max, int total) {
      var sb = new StringBuilder();
      for (int i = 0; i < ths.Count && i < max; i++) { if (i > 0) sb.Append(','); sb.Append(ths[i].Tid).Append(':').Append(StateTok(ths[i])); }
      if (total > max) sb.Append(",+").Append(total - max);
      if (sb.Length == 0) sb.Append('-');
      return sb.ToString();
    }

    // The snapshot block (without its trailing newline), built from the last Take(); at most maxLines lines.
    public string Block(string reason, string when, int selfPid, int mainTid, Probe ps, Probe pf, string freeMb, string commit, int maxLines, int budgetMs) {
      var t0 = Stopwatch.StartNew();
      var ci = CultureInfo.InvariantCulture;
      long now = TakenFt;
      bool cut = false;
      var A = new List<string>();
      var desc = Descendants(selfPid);
      // (a) the watcher's own threads
      Proc self;
      if (ById.TryGetValue(selfPid, out self)) {
        A.Add("self " + Tok(self.Name) + ":" + self.Pid + " thr=" + self.Threads + " hdl=" + self.Handles);
        int pst = ps.OsTid, pft = pf.OsTid; bool psr = ps.Running, pfr = pf.Running;
        foreach (var th in ThreadsOf(self, 60)) {
          string mark = "";
          if (th.Tid == mainTid) mark += " main";
          if (psr && th.Tid == pst) mark += " probe-start";
          if (pfr && th.Tid == pft) mark += " probe-file";
          A.Add("  self tid=" + th.Tid + " " + StateTok(th) + mark);
        }
      } else A.Add("self not listed");
      // (b) the start probe and its child programs
      A.Add("probe start " + ps.PhaseText() + " exe=" + Tok(ps.ExeName));
      A.Add("probe file running=" + (pf.Running ? "yes run_s=" + pf.RunningSeconds.ToString("0.0", ci) : "no"));
      int nk = 0, cpid = ps.ChildPid;
      foreach (var p in Procs) {
        if (!desc.Contains(p.Pid)) continue;
        if (++nk > 10) continue;
        var ths = ThreadsOf(p, 20);
        A.Add("  child " + Tok(p.Name) + ":" + p.Pid + " parent=" + p.Ppid + ":" + Tok(ParentName(p)) + (p.Pid == cpid ? " probe-child" : "") +
              " age=" + ((now - p.Create) / 10000000L) + "s thr=" + p.Threads + " hdl=" + p.Handles + " threads=" + Threads(ths, 20, p.Threads));
      }
      if (nk == 0) A.Add("  child none listed");
      else if (nk > 10) A.Add("  child +" + (nk - 10) + " more");
      // (d) system programs by name
      var D = new List<string>();
      foreach (var n in SysNames) {
        int cnt = 0, thr = 0; var by = new Dictionary<string, int>();
        foreach (var p in Procs) {
          if (!string.Equals(p.Name, n, StringComparison.OrdinalIgnoreCase)) continue;
          cnt++; thr += p.Threads;
          foreach (var th in ThreadsOf(p, 4096)) { string k = StateTok(th); int v; by.TryGetValue(k, out v); by[k] = v + 1; }
        }
        var kv = new List<KeyValuePair<string, int>>(by);
        kv.Sort(delegate (KeyValuePair<string, int> a, KeyValuePair<string, int> b) { int c = b.Value.CompareTo(a.Value); return c != 0 ? c : string.CompareOrdinal(a.Key, b.Key); });
        var sb = new StringBuilder("sys " + n + " n=" + cnt + " thr=" + thr);
        for (int i = 0; i < kv.Count && i < 10; i++) sb.Append(' ').Append(kv[i].Key).Append('=').Append(kv[i].Value);
        if (kv.Count > 10) sb.Append(" +").Append(kv.Count - 10).Append(" kinds");
        D.Add(sb.ToString());
        if (t0.ElapsedMilliseconds > budgetMs) { cut = true; break; }
      }
      // (e) totals
      D.Add("totals procs=" + Procs.Count + " thr=" + ThreadTotal + " hdl=" + HandleTotal + " commit=" + commit + "% free=" + freeMb + "MB");
      // (c) programs created in the last 10 minutes, newest first, in the lines that are left
      var R = new List<Proc>();
      long lim = now - 600L * 10000000L;
      foreach (var p in Procs) if (p.Create >= lim && p.Pid != selfPid && !desc.Contains(p.Pid) && p.Pid > 4) R.Add(p);
      R.Sort(delegate (Proc a, Proc b) { return b.Create.CompareTo(a.Create); });
      int room = maxLines - 2 - A.Count - D.Count;
      var C = new List<string>();
      int shown = 0;
      for (int i = 0; i < R.Count; i++) {
        if (cut || t0.ElapsedMilliseconds > budgetMs) { cut = true; break; }
        if (C.Count >= room - 1 && i < R.Count - 1) break;   // keep one line for "+n more"
        if (C.Count >= room) break;
        var p = R[i];
        C.Add("recent " + Tok(p.Name) + ":" + p.Pid + " parent=" + p.Ppid + ":" + Tok(ParentName(p)) + " age=" + ((now - p.Create) / 10000000L) +
              "s thr=" + p.Threads + " first=" + Threads(ThreadsOf(p, 3), 3, p.Threads));
        shown++;
      }
      if (shown < R.Count && C.Count < room) C.Add("recent +" + (R.Count - shown) + " more");
      var outp = new StringBuilder();
      outp.Append("SNAPSHOT begin reason=").Append(reason).Append(" t=").Append(when).Append(" query_ms=").Append(QueryMs).Append("\r\n");
      foreach (var s in A) outp.Append(s).Append("\r\n");
      foreach (var s in C) outp.Append(s).Append("\r\n");
      foreach (var s in D) outp.Append(s).Append("\r\n");
      LastBuildMs = t0.ElapsedMilliseconds;
      outp.Append("SNAPSHOT end lines=").Append(A.Count + C.Count + D.Count + 2).Append(" build_ms=").Append(LastBuildMs)
          .Append(" recent=").Append(shown).Append('/').Append(R.Count).Append(cut ? " truncated=time" : "");
      return outp.ToString();
    }
  }
}
'@

$fs = $null; $sw = $null
try {
  $fs = New-Object IO.FileStream($Log, [IO.FileMode]::Append, [IO.FileAccess]::Write, [IO.FileShare]::ReadWrite, 4096, [IO.FileOptions]::WriteThrough)
  $enc = New-Object Text.UTF8Encoding($false)
  $sw = New-Object IO.StreamWriter($fs, $enc); $sw.AutoFlush = $true
  $now = { (Get-Date).ToString('HH:mm:ss') }
  function Ev([string]$s) { $sw.WriteLine(('EVENT: {0} t={1}' -f $s, (& $now))) }

  if (-not ('PcWatch.Snap' -as [type])) { Add-Type -TypeDefinition $src -Language CSharp }

  $stopPath = Join-Path $dir 'pc-watch.stop'
  $warnPath = Join-Path $dir 'WATCH-WARNING.txt'
  $probeDir = Join-Path $dir 'pc-watch-probe'
  if (-not [IO.Directory]::Exists($probeDir)) { [void][IO.Directory]::CreateDirectory($probeDir) }
  foreach ($old in [IO.Directory]::GetFiles($probeDir, 'p*.tmp')) { try { [IO.File]::Delete($old) } catch {} }
  if ([IO.File]::Exists($stopPath)) { [IO.File]::Delete($stopPath); Ev 'STALE-STOP-FILE removed at start' }

  $pStart = New-Object PcWatch.Probe('start'); $pStart.Exe = $StartProbeExe; $pStart.Args = $StartProbeArgs
  $pFile = New-Object PcWatch.Probe('file'); $pFile.Dir = $probeDir; $pFile.DelayMs = 1000 * $FileProbeDelaySeconds
  $probes = @{ start = $pStart; file = $pFile }
  $blockNext = @{ start = 15; file = 15 }
  $blockSeen = @{ start = $false; file = $false }
  $snap = New-Object PcWatch.Snap
  $mainTid = [int][PcWatch.Sys]::GetCurrentThreadId()
  [void][PcWatch.Sys]::Cpu()
  $wn = $WatchName; if ($wn -eq '') { $wn = '-' }

  Ev ('START pid={0} period={1}s hours={2} watch_name={3} warn_mb={4} warn_vm_mb={5} slow_ms={6} max_snapshots_per_hour={7} start_probe="{8} {9}" file_probe_delay={10}s main_tid={11} spi={12} sti={13} log={14}' -f $PID, $PeriodSeconds, $Hours, $wn, $WarnMb, $WarnVmMb, $SlowMs, $MaxSnapshotsPerHour, $StartProbeExe, $StartProbeArgs, $FileProbeDelaySeconds, $mainTid, [PcWatch.Snap]::SpiSize, [PcWatch.Snap]::StiSize, $Log)

  $endAt = (Get-Date).AddHours($Hours)
  $clock = [Diagnostics.Stopwatch]::StartNew()
  $periodMs = 1000 * $PeriodSeconds
  $tick = 0
  $avPid = $null; $avGone = $false; $lastWarn = $null; $avSigLast = $null
  $lastSlow = $null
  $snap15 = $false; $snap60 = $false
  $snapTimes = New-Object 'Collections.Generic.Queue[datetime]'
  $snapErrLast = $null
  $reason = 'hours'

  while ($true) {
    $due = [long]$tick * $periodMs
    $wait = $due - $clock.ElapsedMilliseconds
    if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
    if ([IO.File]::Exists($stopPath)) { $reason = 'stop-file'; break }
    if ((Get-Date) -ge $endAt) { break }
    $lag = $clock.ElapsedMilliseconds - $due
    $events = New-Object Collections.Generic.List[string]
    $toBegin = New-Object Collections.Generic.List[object]
    $snapReason = $null
    try {
      $m = [PcWatch.Sys]::Mem()
      if ($null -ne $m) { $free = [long]($m[0] / 1MB); $commit = [int](100.0 * ($m[1] - $m[2]) / $m[1]) } else { $free = '?'; $commit = '?' }
      $cpu = [PcWatch.Sys]::Cpu()

      $ok = $snap.Take()
      if ($ok) {
        $procCount = $snap.Procs.Count; $thrAll = $snap.ThreadTotal; $hdlAll = $snap.HandleTotal
        $node = $snap.CountName('node'); $pw = $snap.CountName('powershell'); $wer = $snap.CountName('WerFault') + $snap.CountName('WerFaultSecure')
        $snapErrLast = $null
      } else {
        $procCount = '?'; $thrAll = '?'; $hdlAll = '?'; $node = '?'; $pw = '?'; $wer = '?'
        if ($snap.Error -ne $snapErrLast) { $events.Add(('SNAP-ERROR {0}' -f $snap.Error)); $snapErrLast = $snap.Error }
      }

      $avPart = ''
      if ($WatchName -ne '' -and $ok) {
        $av = $null; $avN = 0; $avSig = New-Object Collections.Generic.List[string]
        foreach ($p in $snap.Named($WatchName)) {
          # an exited process that something still holds open stays listed with no threads and no handles
          if ($p.Threads -eq 0 -or $p.Handles -eq 0) { $avSig.Add('' + $p.Pid + ':exited'); continue }
          $avSig.Add('' + $p.Pid)
          $avN++
          if ($null -eq $av -or $p.Priv -gt $av.Priv) { $av = $p }
        }
        $avSig.Sort(); $sig = ($avSig -join ','); if ($sig -eq '') { $sig = '-' }
        if ($null -ne $avSigLast -and $sig -ne $avSigLast) { $events.Add(('AV-PROCS now={0} was={1}' -f $sig, $avSigLast)) }
        $avSigLast = $sig
        if ($null -eq $av) {
          $avField = 'none'; $vmField = '-'; if ($sig -ne '-') { $avField = 'none(' + $sig + ')' }
          if ($null -ne $avPid -and -not $avGone) { $events.Add(('AV-GONE last={0}' -f $avPid)); $avGone = $true }
        } else {
          $privMb = [long]($av.Priv / 1MB)
          $avField = '{0}/{1}/{2}/{3}' -f $av.Pid, $privMb, [long]($av.Ws / 1MB), $av.Handles
          if ($avN -gt 1) { $avField += ('+{0}more' -f ($avN - 1)) }
          $vmField = [long]($av.Vm / 1MB)
          if ($null -ne $avPid -and $av.Pid -ne $avPid) { $events.Add(('AV-RESTART old={0} new={1}' -f $avPid, $av.Pid)) }
          $avPid = $av.Pid; $avGone = $false
          $on = $null; if ($privMb -ge $WarnMb) { $on = 'priv' } elseif ($vmField -ge $WarnVmMb) { $on = 'vm' }
          if ($null -ne $on -and ($null -eq $lastWarn -or ((Get-Date) - $lastWarn).TotalSeconds -ge 60)) {
            $lastWarn = Get-Date
            $events.Add(('AV-WARN priv={0} ws={1} handles={2} vm={3} pid={4} on={5} warn_mb={6} warn_vm_mb={7}' -f $privMb, [long]($av.Ws / 1MB), $av.Handles, $vmField, $av.Pid, $on, $WarnMb, $WarnVmMb))
            $txt = ('At {0} the watched process {1} (pid {2}) held {3} MB of private memory and {4} MB of virtual size, at or above a warning level ({5} MB private or {6} MB virtual).' -f $lastWarn.ToString('yyyy-MM-dd HH:mm:ss'), $WatchName, $av.Pid, $privMb, $vmField, $WarnMb, $WarnVmMb) + "`r`n" +
                   'Written by pc-watch.ps1 (-WatchName); the AV-WARN lines in its log give the times.' + "`r`n"
            try { [IO.File]::WriteAllText($warnPath, $txt) } catch { $events.Add('WARN-FILE-FAILED ' + $_.Exception.GetType().Name) }
          }
        }
        $avPart = (' av={0} av_vm={1}' -f $avField, $vmField)
      } elseif ($WatchName -ne '') { $avPart = ' av=? av_vm=?' }

      $vals = @{}
      foreach ($k in @('start', 'file')) {
        $pr = $probes[$k]
        if ($pr.Running) {
          $s = [int][Math]::Floor($pr.RunningSeconds)
          if ($s -ge $blockNext[$k]) {
            $extra = ''; if ($k -eq 'start') { $extra = (' phase={0} child={1}' -f $pr.Phase, $pr.ChildPid) }
            $events.Add(('BLOCK {0} since={1}s{2}' -f $k, $s, $extra)); $blockSeen[$k] = $true
            $blockNext[$k] = ([Math]::Floor($s / 15) + 1) * 15
          }
          if ($k -eq 'start') {
            if ($s -ge 15 -and -not $snap15) { $snapReason = 'block15'; $snap15 = $true }
            elseif ($s -ge 60 -and -not $snap60) { $snapReason = 'block60'; $snap60 = $true }
          }
          $vals[$k] = 'BLOCKED:' + $s
        } else {
          $r = $pr.TakeResult(); if ($null -eq $r) { $r = '-' }
          if ($blockSeen[$k]) {
            $extra = ''; if ($k -eq 'start') { $extra = (' create_ms={0}' -f $pr.LastCreateMs); $snapReason = 'unblock' }
            $events.Add(('UNBLOCK {0} after {1:0.0}s{2}' -f $k, $pr.LastSeconds, $extra)); $blockSeen[$k] = $false
          } elseif ($k -eq 'start' -and $r -ne '-') {
            $msv = 0
            if ([int]::TryParse($r, [ref]$msv) -and $msv -gt $SlowMs -and ($null -eq $lastSlow -or ((Get-Date) - $lastSlow).TotalSeconds -ge 60)) {
              $lastSlow = Get-Date
              $events.Add(('SLOW start={0} create_ms={1} slow_ms={2}' -f $msv, $pr.LastCreateMs, $SlowMs))
            }
          }
          if ($k -eq 'start') { $snap15 = $false; $snap60 = $false }
          $blockNext[$k] = 15
          $vals[$k] = $r
          $toBegin.Add($pr)
        }
      }

      $t = & $now
      $sw.WriteLine(('{0} lag={1} free={2} commit={3} cpu={4} procs={5} thr={6} hdl={7} node={8} ps={9} wer={10}{11} start_ms={12} file_ms={13}' -f $t, $lag, $free, $commit, $cpu, $procCount, $thrAll, $hdlAll, $node, $pw, $wer, $avPart, $vals['start'], $vals['file']))
      if ($ok) {
        $nl = $null
        try { $nl = $snap.NewLine($PID, 30) } catch { $events.Add('NEW-ERROR ' + $_.Exception.GetType().Name) }
        if ($null -ne $nl) { $sw.WriteLine($nl) }
      }
      foreach ($e in $events) { Ev $e }

      if ($null -ne $snapReason) {
        $nowD = Get-Date
        while ($snapTimes.Count -gt 0 -and ($nowD - $snapTimes.Peek()).TotalMinutes -ge 60) { [void]$snapTimes.Dequeue() }
        if (-not $ok) {
          Ev ('SNAPSHOT-SKIPPED reason={0} no-snapshot' -f $snapReason)
        } elseif ($snapTimes.Count -ge $MaxSnapshotsPerHour) {
          Ev ('SNAPSHOT-SKIPPED reason={0} cap={1}/h' -f $snapReason, $MaxSnapshotsPerHour)
        } else {
          $snapTimes.Enqueue($nowD)
          try {
            $blk = $snap.Block($snapReason, $t, $PID, $mainTid, $pStart, $pFile, [string]$free, [string]$commit, 250, 500)
            $bytes = $enc.GetBytes($blk + "`r`n")
            $wsw = [Diagnostics.Stopwatch]::StartNew()
            $sw.Flush(); $fs.Write($bytes, 0, $bytes.Length); $fs.Flush()
            Ev ('SNAPSHOT-COST reason={0} query_ms={1} build_ms={2} write_ms={3} bytes={4}' -f $snapReason, $snap.QueryMs, $snap.LastBuildMs, $wsw.ElapsedMilliseconds, $bytes.Length)
          } catch {
            Ev ('SNAPSHOT-ERROR ' + $_.Exception.GetType().Name + ': ' + ($_.Exception.Message -replace '\s+', ' '))
          }
        }
      }
    } catch {
      try { Ev ('ERROR ' + $_.Exception.GetType().Name + ': ' + ($_.Exception.Message -replace '\s+', ' ')) } catch {}
    }
    foreach ($pr in $toBegin) { try { [void]$pr.Begin() } catch {} }
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
    # an antivirus can hold a just-closed file for a moment; a lock file left behind is harmless (nobody holds it)
    for ($i = 0; $i -lt 10; $i++) { try { [IO.File]::Delete($lockPath); break } catch { Start-Sleep -Milliseconds 300 } }
  }
}
