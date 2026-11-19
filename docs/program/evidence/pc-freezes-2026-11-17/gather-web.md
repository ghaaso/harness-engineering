# gather:web - what outside sources say about claims C3 to C6

Opened on 2026-11-17 (about 16:15 to 16:20 local). No PowerShell tool call was made (0 of 0 allowed). Work was done with the
Bash tool (`curl` for page text, `grep`, `node`); no process was left running. Search terms were generic (product
names, error texts, Windows concepts); nothing about the owner or the machine left it.

Two kinds of evidence are kept apart below:

- **Page text** = I downloaded the page with `curl` and read its own text (or its source code). Saved copies are in the session's
  scratchpad `gw` folder, not in the evidence folder.
- **Summary** = the web-search tool or the fetch tool returned a short summary written by a small model. That is not a
  reading of the page. Every item marked "summary" must be opened by a person before it is relied on.

Blocked: malwaretips.com, wilderssecurity.com and forum.eset.com answered my `curl` with a Cloudflare "Just a moment" bot check. I did
not try to get past it. Everything from those three sites is therefore summary only, or not read. The vendor's own uninstall page
(360totalsecurity.com/support/how-to/uninstall) is drawn by JavaScript; `curl` got only "Loading...". Also summary only.

---

## Q1. Is QHActiveDefense.exe reported to use very high memory, leak, or crash? Link to PowerShell or developer tools?

**Finding.** Nothing found that says QHActiveDefense.exe leaks without bound or that a PowerShell start makes it grow. What exists is old
(about 2014 to 2016, versions 6 to 9) and mostly about size: 90 MB, 150 to 200 MB with a third-party engine switched on, 380 to 510 MB, one
report of more than 700 MB with version 9.0.0.1115 and instability, one report of a full CPU core traced to the camera-protection component, and two
threads titled "service not found" / "QHActiveDefense.exe is not running". The vendor's own article is quoted as saying 150 to 200 MB is normal.
No report links it to PowerShell, scripts or developer tools. The owner's own figure (1,588 MB just before the service died at 05:04) is far above anything reported.

**Sources.**
- Web search "QHActiveDefense.exe high memory usage 360 Total Security" and the extended repeat on memory leak / crash, opened 2026-11-17: **summary** of
  Wilders Security threads (wilderssecurity.com, "360 Total Security - English", pages 27 and 82 and several post links), malwaretips.com threads
  ("360 Total Security 9.0.0.1115 problem", "7.6.0.1031", "Essential 6.0.0.1021"), bleepingcomputer.com threads ("360 Total Security may have hosed my computer", t/594401;
  "Using 360 Total Security", t/631479). I tried to read the Wilders and malwaretips pages; Cloudflare blocked `curl`. **Not read.**
- https://www.360totalsecurity.com/en/article/360-total-security-benefits-pc-protection (the "150-200 MB" claim): **summary** via search only, not opened.
- file.net and freefixer.com pages on QHActiveDefense.exe: listed by search, not opened.

**Confidence.** Low that there is no such report (the search tool is weak on forum posts and I could not read the forums); high that I found none.
**Not found.** Any report of a leak, a 2 GB ceiling, a crash with Event 7034, or a link to PowerShell. Any current-version (10.x) report.

---

## Q2. Does 360 or antivirus in general slow every PowerShell start? What is a normal -NoProfile start of Windows PowerShell 5.1?

**Finding.** Antivirus real-time scanning slowing PowerShell startup is reported many times for other products: a Kaspersky forum thread (22 seconds; the same
person saw it fast once Defender's real-time protection was off; after installing Kaspersky it was still slow even with Kaspersky's protection paused for
a minute), an ESET thread (5 seconds, "fixed in latest pre-release"), a PowerShell issue about BeyondTrust/Avecto (a prompt and a delay of about 15 seconds on
64-bit 5.1 only), and a JetBrains post showing Microsoft Defender scanning some developer tools for 30+ seconds at startup but others in under a second, depending on
the path and trust of the process. AMSI (Microsoft's scan interface for script content) is documented as something an application calls to ask the registered scanner
for a verdict; I found no source that measures AMSI as the cause of slow starts, and none that says 360 registers an AMSI provider.
No source states a normal 5.1 `-NoProfile` start time. The only figures found are for PowerShell 7: about 300 to 350 ms with `-NoProfile` from a tool's README (summary), and a
Reddit comment that `-noprofile` starts "as fast as cmd" (summary). From my general knowledge (not from a source): on a fast desktop it is usually a few hundred milliseconds, so 2.1 s
here is several times that; the owner's own comparison (`cmd /c ver` 31 ms) is the stronger evidence. Whether 360 is the reason for the 2.1 s is **not shown by any source**.

**Sources.**
- https://forum.kaspersky.com/topic/slow-22-seconds-to-open-powershell-24941 "Slow (22 seconds) to open powershell", opened 2026-11-17: **page text** (I read the first post and the later post quoted above).
- https://github.com/PowerShell/vscode-powershell/issues/3077 "Some Antivirus (BeyondTrust/Avecto DefendPoint) may cause PowerShell Extension to stop responding", opened 2026-11-17: **page text** (grepped; the product is not 360).
- https://blog.jetbrains.com/dotnet/2026/09/09/why-rider-and-resharper-were-slow-to-start-and-how-microsoft-helped-fix-the-problem/ , opened 2026-11-17: **page text** (Defender scan time per tool; about Defender, not 360).
- https://learn.microsoft.com/en-us/windows/win32/amsi/how-amsi-helps "How AMSI helps", opened 2026-11-17: **page text** (what AMSI is; says nothing about timing or third-party products).
- https://forum.eset.com/topic/12035-... (ESET 5 seconds): **summary** only (Cloudflare block).
- https://woshub.com/powershell-slow-startup/ : downloaded, only generic profile/module advice found by my grep; I did not read it fully. Search summary says antivirus is a "common" cause.
- https://devblogs.microsoft.com/powershell/optimizing-your-profile/ : profile took 1465 ms; says nothing about `-NoProfile` or about 5.1 vs 7. Page text (grepped).
- pwsh-startup README (300 to 350 ms) and the Reddit comment: **summary** from search, not opened.

**Confidence.** High that antivirus can slow PowerShell starts (several independent reports, one read in full). Low for any statement about 360 specifically (no report found). Low for the normal start time (no source).
**Not found.** A 360 report of slow PowerShell. A published Windows PowerShell 5.1 `-NoProfile` start time. Any statement that antivirus growth in memory follows PowerShell starts.

---

## Q3. Address-space limit of a 32-bit process without the large-address-aware flag

**Finding.** Microsoft's "Memory Limits for Windows Releases" table, row "User-mode virtual address space for each 32-bit process": on 64-bit Windows,
**2 GB with IMAGE_FILE_LARGE_ADDRESS_AWARE cleared (the default), 4 GB with it set.** (32-bit x86 Windows: 2 GB, up to 3 GB with the flag and 4GT.) This is address space, not
working set or memory in use. A process can fail to allocate before it holds 2 GB, because the DLLs, stacks and fragmentation use up the space and a single large
allocation needs a contiguous gap (the same family of pages says addresses near the 2 GB line are used by system DLLs; that part I saw only in a search summary).
So 1,588 MB of working set is consistent with a process near its ceiling, but the page does not say what happens at the limit; that the service died of exhaustion is not shown (no dump).
Note also that the flag is read from the file's header; your PE reading of 0x014C with the flag clear matches the table's "cleared (default)" case.

**Sources.**
- https://learn.microsoft.com/en-us/windows/win32/memory/memory-limits-for-windows-releases "Memory limits for Windows releases", opened 2026-11-17: **page text** (the table row quoted above).
- https://learn.microsoft.com/en-us/windows/win32/memory/4-gigabyte-tuning (contiguous-allocation remark): **summary** only, not opened.

**Confidence.** High for the limit. Medium for "that is why the service died" (nothing in the sources shows it; it fits the memory curve in the evidence file).
**Not found.** Anything about how 360 behaves at the limit.

---

## Q4. Can a failed, hung or restarted antivirus service make process creation or file opens block system-wide?

**Finding.** The mechanisms exist and are documented; a statement that a dead or restarted antivirus service freezes the machine is not.
(a) A process-creation callback registered with `PsSetCreateProcessNotifyRoutineEx` runs at PASSIVE_LEVEL, inside a critical region with normal kernel APCs disabled,
**in the context of the thread that creates the process**; the page says nothing about timeouts. So anything such a driver waits for, the creating thread waits for.
(b) A minifilter that asks its user-mode service for a verdict uses `FltSendMessage`; with the timeout left NULL, Filter Manager puts the minifilter's thread **into a wait state indefinitely** until the application fetches the message.
(c) Reported cases of a filter blocking others: an OSR thread where Defender's minifilter (WdFilter) held up `IRP_MJ_ACQUIRE_FOR_SECTION_SYNCHRONIZATION` (mapping an executable or DLL) while it queued the file for a scan with `FltSendMessage`, deadlocking some processes ("MobaXTerm or powershell when starting from VSCode"), only some processes, not the whole system;
an OSR thread where a file-protection minifilter plus Kaspersky made some machines freeze "not a full freeze": the mouse moved, Ctrl+Alt+Del did nothing; four threads waited on one resource; moving the minifilter's altitude below Kaspersky's removed it; a kernel dump was obtained only by forcing a bugcheck from the keyboard driver; and a Microsoft KB (4039810) where a minifilter's
`FltSendMessage` wait plus a lock held by Csc.sys froze every application that opened the same file (a file, not all programs).
I found **no report, and no document, of the exact picture "everything already running carries on, new programs do not start" tied to an antivirus service dying or restarting.** What happens when the user-mode service disappears (does `FltSendMessage` fail fast on a closed port, or wait?) I did not find a source for; that part is **not checked**.
The first two items are mechanism, not evidence that 360's drivers do this. Which drivers of 360 register process or file callbacks was not examined (not a web question).

**Sources.**
- https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-pssetcreateprocessnotifyroutineex , opened 2026-11-17: **page text** (Remarks).
- https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltsendmessage "FltSendMessage", opened 2026-11-17: **page text** (Timeout NULL = wait indefinitely).
- https://community.osr.com/t/wdfilter-deadlocks-with-fltcreatesectionfordatascan/58187 , opened 2026-11-17: **page text**, the first post and replies (a developer's report, a single case; the driver in the report was Defender, not 360).
- https://community.osr.com/t/kaspersky-combined-with-our-minifilter-causes-very-few-machines-to-freeze-how-to-find-the-cause/57928 , opened 2026-11-17: **page text** (first post and the later dump analysis; no vendor root cause stated).
- https://support.microsoft.com/en-us/kb/4039810 (redirects to Learn, "Applications freeze when they concurrently try to access a file on a network drive in Windows"), opened 2026-11-17: **page text**.
- An OSR thread on a forum-posted AV-filter problem and a Defender-service-crash report: **summary** only, not opened.

**Confidence.** High that the two Microsoft mechanisms are as described. Medium that "a hung (not dead) user-mode scan service can stall process creation or image mapping" is a real class of fault (one read thread, one summary). Low to none for "a service death/restart causes the stall seen on 2026-11-17".
**Not found.** A report that matches the symptom; behaviour of a minifilter when its service dies; any statement about 360FsFlt, 360AvFlt or disproc.

---

## Q5. Does Node (libuv, `uv_spawn`) call `CreateProcess` synchronously on the event-loop thread?

**Finding.** Yes for libuv on Windows, by the source: in `src/win/process.c` (branch v1.x, read today), `uv_spawn` is an ordinary function that calls `CreateProcessW(...)` inline (line 1132 of the 44,940-byte file I downloaded)
and returns an error from it if it fails; only afterwards does it register an asynchronous wait for the child's exit (`RegisterWaitForSingleObject`). Nothing hands the creation to the thread pool.
So a `CreateProcessW` that blocks for any reason blocks the thread that called `uv_spawn`. For Node's `child_process.spawn` that is the thread running JavaScript (the main thread, unless called from a worker); for an
Electron main process, the same (**inference**: I read libuv, not Node's or Electron's glue). The Node docs say `spawn` runs "asynchronously, without blocking the event loop" (**summary**); that means it does not wait for the child to finish, not that creation is off-thread.
A Node issue found by the search (nodejs/node #21632, spawn very slow on Windows) turned out to be about `npm.cmd` behind a proxy and has nothing about antivirus or CreateProcess; I read its comments through the GitHub API and set it aside.

**Sources.**
- https://raw.githubusercontent.com/libuv/libuv/v1.x/src/win/process.c , opened 2026-11-17: **page text** (the source file itself; lines about 899, 1132, 1194).
- https://docs.libuv.org/en/v1.x/process.html : **summary** only (search), not opened.
- https://nodejs.org/api/child_process.html : **summary** only (search).
- https://github.com/nodejs/node/issues/21632 , opened through `api.github.com` 2026-11-17: **page text** (comments); not relevant.

**Confidence.** High for libuv. Medium for "freezes a Node or Electron main process" (follows from the source, not observed).
**Not found.** A report of a blocked `CreateProcess` freezing Electron or Node because of an antivirus.

---

## Q6. Removing 360 Total Security on Windows 11; does Defender turn itself on?

**Finding.** *Removal:* the vendor's own page ("how to uninstall") is only readable through a search summary: find the entry in the list of programs, double-click it, follow the uninstall procedure, click Continue. **I did not find a separate vendor removal tool**; sites that claim "an official uninstall tool" gave no link to the vendor (SEO sites, contradicting each other). Several third-party guides say Settings > Apps > Installed apps > Uninstall, choose to remove settings when asked, restart,
then check for a leftover `360` folder; one says the uninstaller is `C:\Program Files (x86)\360\Total Security\Uninstall.exe`; leftover lists on advanceduninstaller.com name files and registry keys.
*Drivers:* nothing found about what happens to `360FsFlt`, `360AvFlt`, `360Box64`, `360netmon` or `360disproc64.sys`; one guide only warns that a wrong removal can leave "drivers, services, registry entries". *Defender:* Microsoft's compatibility page (read): on Windows 10 and 11 clients, when a non-Microsoft antivirus is present, Defender Antivirus is in "Disabled mode (happens automatically)"; the Windows Security app page (read) says Defender "will automatically turn itself off" when a compatible product is installed; and a warning says that if the Security Center service is disabled, Defender cannot see the other product and stays active.
The one line about uninstalling ("make sure that Microsoft Defender Antivirus is re-enabled") sits in the Windows Server note, not the client row. **I found no Microsoft text that says, for a Windows 11 client, that Defender turns itself back on after the other product is removed.** Community answers (summary) say it does after a restart when the old product's registration is gone, and that leftover registration can prevent it.

**Sources.**
- https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-compatibility , opened 2026-11-17: **page text**.
- https://support.microsoft.com/en-us/windows/virus-and-threat-protection-in-the-windows-security-app-1362f4cd-d71a-b52a-0b66-c2820032b65e , opened 2026-11-17: **page text** (grepped; the sentence quoted above).
- https://360totalsecurity.com/support/how-to/uninstall (vendor): **summary** (page is drawn by script; `curl` returned "Loading...").
- https://geekchamp.com/?p=248145, https://lists.wisecleaner.com/how-to/343-how-to-uninstall-360-total-security-on-windows-11.html, https://www.advanceduninstaller.com/ (360 Total Security entries), https://macmyths.com/how-to-uninstall-third-party-antivirus-properly-from-windows-11 : **summary** only; low-quality, mostly SEO or tool-vendor pages.
- https://learn.microsoft.com/en-us/answers/questions/3834618/cannot-turn-microsoft-defender-back-on-after-unins : listed by search, **not opened**.

**Confidence.** High for "Defender is switched off automatically while another product is registered". Low for the exact removal steps and for what stays behind. Medium that Defender returns after a clean removal and restart (community, not Microsoft text).
**Not found.** A vendor-published removal tool or leftover list; any word on its kernel drivers; Microsoft text about clients after removal.

---

## Q7. What does Kernel-Power 41 with no bugcheck mean after a system-wide hang?

**Finding.** Microsoft's older wiki page (Kernel Power Event ID 41), read in full: the system "rebooted without cleanly shutting down first", which "could be caused if the system stopped responding, crashed, or lost power unexpectedly". With BugcheckCode 0 and PowerButtonTimestamp 0 it describes "scenario 3": a power loss, or the machine "hard-locked" and powered off; it says this "usually indicates a problem with the hardware and/or the device driver" and lists overclocking, memory, power supply and heat as the checks, and a Caps Lock test (light does not change: hard hang).
So the event cannot by itself tell a software block from a hardware fault: a software deadlock that ends with the owner's reset gives the same record, and so does a bad PSU. It does **not** point at software.
One inference from the evidence file, not from a source: on 15:43 the owner saw the system's "not responding, end process or keep waiting" dialog, which means the desktop was still drawing windows, so this was probably not a total hard lock; but it does not exclude hardware.

**Sources.**
- https://learn.microsoft.com/en-us/archive/technet-wiki/14246.kernel-power-event-id-41 "Kernel Power Event ID 41", opened 2026-11-17: **page text** (archived TechNet wiki, not current documentation; its title and wording are the old ones).
- https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/troubleshoot-event-id-41-restart : the address I tried returned "We couldn't find this page". Not read.
- Microsoft Q&A threads on event 41 and BugcheckCode 0: **summary** only (they say PSU, RAM, firmware; "half freezes, half power loss").

**Confidence.** High for what the page says. The conclusion "cannot separate" is my reading of it.
**Not found.** Current (non-archive) Microsoft text; any statistics on the share of software versus hardware causes.

---

## Across the questions (inference, flagged)

- Everything needed for the chain C3 to C6 has a documented mechanism (2 GB limit, process creation done on the caller's thread, synchronous `CreateProcessW` in libuv, indefinite minifilter waits) but **no source ties 360 to any of them**, and none shows PowerShell starts making an antivirus service grow. C4 and C5 rest on the owner's own measurements only.
- One detail in the evidence file worth a second look by the other readers: after 15:43:43 the recorder (an already running PowerShell) kept writing every 2 s while the 16 already-running model workers and another helper stopped; "already running programs continue" is therefore not true of all of them. A block on file opens or on starting something would fit that better than a block on process creation alone. This is a reading of the evidence file, not of the web sources.
- Item nobody can currently verify: whether the owner's 360 drivers register process-creation or file callbacks. That is a read of the driver files on the machine, not a web question.
