# Installs the Android toolchain for the device lab (plan L3) and for P0a item 10 into a USER
# folder. Approved by the owner on 2026-11-13 ("Yes, install"; about 8 GB, SDK licence accepted).
#
# Nothing system-wide: no PATH change, no registry key, no service, no admin rights, no change to
# any security product. Everything lands under $Root (default
# C:\Users\User\.fixflow-cache\android). Uninstall = delete that folder.
#
# What it installs, from official sources only, every archive checked against its published
# checksum before it is opened and every unpacked file checked against the archive:
#   - Eclipse Temurin JDK 17            api.adoptium.net -> github.com/adoptium (SHA-256)
#   - Android command-line tools        developer.android.com/studio -> dl.google.com (SHA-256)
#   - platform-tools (adb) and the newest stable build-tools (apksigner, aapt2), through
#     Google's sdkmanager
#   - the Android Emulator and ONE system image (Android 14 / API 34, Google APIs, x86_64: it
#     carries Play Services, which geofencing needs, and allows adb root, which the lab needs),
#     unpacked DIRECTLY from the archives Google's own manifests name (SHA-1 as published there)
#   - one AVD, ff34, written by hand
#
# Why the emulator and the image do not go through sdkmanager (found the hard way, 2026-11-13):
# this PC's antivirus (360 Total Security) blocks the creation of the emulator's
# lib64\gles_angle\d3dcompiler_47.dll every time. sdkmanager abandons a package when one file
# fails, the system image depends on the emulator package, and so neither can be installed
# through it here. The block is left alone: that one DLL stays absent (the emulator is then
# never run in an ANGLE gpu mode), every file this script could not create is listed in
# BLOCKED-FILES.txt, and allowing the folder in the antivirus is the owner's decision.
#
# The script reports success only for what it finds on disk. Its first version printed
# "INSTALL OK" with no SDK package installed: a PowerShell pipe into sdkmanager.bat installs
# nothing and exits 0, so sdkmanager is run through cmd.exe with its answers from a file.
# sdkmanager 22.0 calls itself deprecated in favour of the "android" CLI
# (d.android.com/tools/agents/android-cli); it still works for the two packages used here.
#
# Idempotent: a finished step is skipped on a re-run. Run:
#   powershell -NoProfile -ExecutionPolicy Bypass -File docs\program\lab\android-toolchain-install.ps1
param(
  [string]$Root = "C:\Users\User\.fixflow-cache\android"
)
# Windows PowerShell 5.1 turns a native command's stderr into a terminating error under 'Stop'
# as soon as stream 2 is redirected, so: 'Continue', exit codes checked by hand, -ErrorAction
# Stop on the cmdlets that must not fail silently.
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$JdkUrl = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.21%2B9/OpenJDK17U-jdk_x64_windows_hotspot_17.0.21_9.zip'
$JdkSum = '98518ecf554465057ee5509462631deeee374bc368c12a411d225cd29381f84b'   # SHA-256, api.adoptium.net, read 2026-11-13
$CltUrl = 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip'
$CltSum = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'   # SHA-256, developer.android.com/studio, read 2026-11-13
$EmuUrl = 'https://dl.google.com/android/repository/emulator-windows_x64-16740729.zip'
$EmuSum = '4d7268aa7787c640ad892844e6c9a5f159e91ad3'   # SHA-1, emulator 37.2.13 stable, dl.google.com/android/repository/repository2-3.xml, read 2026-11-13
$ImgUrl = 'https://dl.google.com/android/repository/sys-img/google_apis/x86_64-34_r14.zip'
$ImgSum = 'e0f6c9a0691aa27bd597d0deb1bcfdc943ac8ca7'   # SHA-1, revision 14, .../sys-img/google_apis/sys-img2-3.xml, read 2026-11-13
$Avd    = 'ff34'

$Dl  = Join-Path $Root 'downloads'
$Sdk = Join-Path $Root 'sdk'
$Jdk = Join-Path $Root 'jdk-17'
$AvdHome = Join-Path $Root 'avd'
$BlockedFile = Join-Path $Root 'BLOCKED-FILES.txt'
New-Item -ItemType Directory -Force $Dl, $Sdk, $AvdHome -ErrorAction Stop | Out-Null
$Tar = Join-Path $env:SystemRoot 'System32\tar.exe'
$script:Blocked = @()

function Say($m) { Write-Output ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m) }

function Get-Verified($url, $sum, $file) {
  $alg = if ($sum.Length -eq 40) { 'SHA1' } else { 'SHA256' }
  if ((Test-Path $file) -and ((Get-FileHash $file -Algorithm $alg).Hash.ToLower() -eq $sum)) { Say "have $(Split-Path $file -Leaf) ($alg ok)"; return }
  Say "downloading $(Split-Path $file -Leaf)"
  & curl.exe -sS -L --fail --retry 5 -C - -o $file $url
  if ($LASTEXITCODE -ne 0) { throw "download failed ($LASTEXITCODE): $url" }
  $got = (Get-FileHash $file -Algorithm $alg).Hash.ToLower()
  if ($got -ne $sum) { throw "CHECKSUM MISMATCH for $file : got $got, expected $sum. Delete the file and run again." }
  Say "$alg ok: $(Split-Path $file -Leaf)"
}

# Unpack with the system tar (bsdtar), then check EVERY file of the archive against the disk by
# name and size, using tar's own listing as the truth, and retry a missing or short file once
# with tar. A file that still cannot be created is recorded as blocked, never silently skipped.
# tar is the only reader used: an earlier version "repaired" mismatches through .NET's zip
# reader, which cannot read entries over 4 GB, and so truncated a good 4.3 GB system.img to
# 0 bytes while the script still printed success (2026-11-13). Existence is not verification.
function Expand-ZipVerified($zip, $dest) {
  New-Item -ItemType Directory -Force $dest -ErrorAction Stop | Out-Null
  & $Tar -xf $zip -C $dest 2>$null
  $count = 0; $retried = 0; $failed = @()
  foreach ($line in (& $Tar -tvf $zip 2>$null)) {
    # -rw-r--r--  0 0      0    4306501632 Jan 01  2008 x86_64/system.img
    if ($line -notmatch '^(\S+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+\S+\s+\d+\s+\S+\s+(.+)$') { continue }
    if ($Matches[1].StartsWith('d')) { continue }
    $size = [int64]$Matches[2]; $name = $Matches[3]
    if ($name -match '(^|/)\.\.(/|$)') { throw "archive entry escapes its folder: $name" }
    $count++
    $target = Join-Path $dest ($name -replace '/', '\')
    $ok = (Test-Path -LiteralPath $target) -and ((Get-Item -LiteralPath $target).Length -eq $size)
    if (-not $ok) {
      $retried++
      & $Tar -xf $zip -C $dest $name 2>$null
      $ok = (Test-Path -LiteralPath $target) -and ((Get-Item -LiteralPath $target).Length -eq $size)
    }
    if (-not $ok) { $failed += "$target (expected $size bytes)" }
  }
  if ($count -eq 0) { throw "could not read the file list of $zip" }
  Say ("unpacked $(Split-Path $zip -Leaf): $count files checked by size, $retried retried, $($failed.Count) blocked")
  foreach ($f in $failed) { Say "  BLOCKED $f"; $script:Blocked += $f }
}

# 1. JDK 17
if (-not (Test-Path (Join-Path $Jdk 'bin\java.exe'))) {
  $zip = Join-Path $Dl 'temurin-17.zip'
  Get-Verified $JdkUrl $JdkSum $zip
  $tmp = Join-Path $Root 'jdk-unpack'
  Expand-ZipVerified $zip $tmp
  $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
  Move-Item $inner.FullName $Jdk -ErrorAction Stop
}
if (-not (Test-Path (Join-Path $Jdk 'bin\java.exe'))) { throw "NOT INSTALLED: JDK ($Jdk\bin\java.exe)" }
$env:JAVA_HOME = $Jdk
Say ("java: " + ((cmd /c "`"$Jdk\bin\java.exe`" -version 2>&1" | Select-Object -First 1) -join ''))

# 2. Android command-line tools -> <sdk>\cmdline-tools\latest
$Bin = Join-Path $Sdk 'cmdline-tools\latest\bin'
if (-not (Test-Path (Join-Path $Bin 'sdkmanager.bat'))) {
  $zip = Join-Path $Dl 'commandlinetools-win.zip'
  Get-Verified $CltUrl $CltSum $zip
  $tmp = Join-Path $Root 'clt-unpack'
  Expand-ZipVerified $zip $tmp
  New-Item -ItemType Directory -Force (Join-Path $Sdk 'cmdline-tools') -ErrorAction Stop | Out-Null
  Move-Item (Join-Path $tmp 'cmdline-tools') (Join-Path $Sdk 'cmdline-tools\latest') -ErrorAction Stop
}
$SdkManager = Join-Path $Bin 'sdkmanager.bat'
if (-not (Test-Path $SdkManager)) { throw "NOT INSTALLED: command-line tools ($SdkManager)" }
$env:ANDROID_HOME = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk
$env:ANDROID_AVD_HOME = $AvdHome

# 3. platform-tools and build-tools through sdkmanager (cmd.exe, answers from a file)
$YesFile = Join-Path $Dl 'yes.txt'
Set-Content -Path $YesFile -Value (@('y') * 80) -Encoding ascii
$bt = (Get-ChildItem (Join-Path $Sdk 'build-tools') -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName 'apksigner.bat') } | ForEach-Object { [version]$_.Name } | Sort-Object | Select-Object -Last 1)
$Adb = Join-Path $Sdk 'platform-tools\adb.exe'
if (-not $bt -or -not (Test-Path $Adb)) {
  Say 'accepting SDK licences (the owner accepted them on 2026-11-13)'
  cmd /c "`"$SdkManager`" --sdk_root=$Sdk --licenses < `"$YesFile`" > `"$Dl\sdkmanager-licenses.log`" 2>&1"
  if (-not $bt) {
    $list = cmd /c "`"$SdkManager`" --sdk_root=$Sdk --list 2>nul"
    $bt = $list | Select-String -Pattern '^\s*build-tools;(\d+\.\d+\.\d+)\s' | ForEach-Object { [version]$_.Matches[0].Groups[1].Value } | Sort-Object | Select-Object -Last 1
    if (-not $bt) { throw 'could not find a stable build-tools version in sdkmanager --list' }
  }
  foreach ($pkg in @('platform-tools', "build-tools;$bt")) {
    $probe = if ($pkg -eq 'platform-tools') { $Adb } else { Join-Path $Sdk "build-tools\$bt\apksigner.bat" }
    for ($i = 1; $i -le 3 -and -not (Test-Path -LiteralPath $probe); $i++) {
      Say "installing $pkg (attempt $i of 3)"
      cmd /c "`"$SdkManager`" --sdk_root=$Sdk `"$pkg`" < `"$YesFile`" > `"$Dl\sdkmanager-$($pkg -replace '[;:]', '_')-try$i.log`" 2>&1"
    }
    if (-not (Test-Path -LiteralPath $probe)) { throw "NOT INSTALLED after 3 attempts: $pkg (see the sdkmanager-*.log files in $Dl)" }
  }
}
$ApkSigner = Join-Path $Sdk "build-tools\$bt\apksigner.bat"

# 4. Emulator and system image, directly from Google's archives
$Emu = Join-Path $Sdk 'emulator\emulator.exe'
if (-not (Test-Path $Emu)) {
  $zip = Join-Path $Dl 'emulator-windows_x64-16740729.zip'
  Get-Verified $EmuUrl $EmuSum $zip
  Expand-ZipVerified $zip $Sdk                       # the archive's top folder is emulator\
}
$ImageDir = Join-Path $Sdk 'system-images\android-34\google_apis\x86_64'
$SystemImg = Join-Path $ImageDir 'system.img'
$SystemImgBytes = 4306501632                         # from the archive's own listing; an empty or short file is not an image
if (-not ((Test-Path $SystemImg) -and ((Get-Item $SystemImg).Length -eq $SystemImgBytes))) {
  $zip = Join-Path $Dl 'x86_64-34_r14.zip'
  Get-Verified $ImgUrl $ImgSum $zip
  Expand-ZipVerified $zip (Split-Path $ImageDir -Parent)   # the archive's top folder is x86_64\
}

# 5. The script reports success only for what is on disk
$need = [ordered]@{ 'adb' = $Adb; 'apksigner' = $ApkSigner; 'emulator' = $Emu; 'system image' = (Join-Path $ImageDir 'system.img') }
$missing = @()
foreach ($k in $need.Keys) { if (-not (Test-Path -LiteralPath $need[$k]) -or ((Get-Item -LiteralPath $need[$k]).Length -eq 0)) { $missing += "$k ($($need[$k]))" } }
if ((Test-Path $SystemImg) -and ((Get-Item $SystemImg).Length -ne $SystemImgBytes)) { $missing += "system image is $((Get-Item $SystemImg).Length) bytes, expected $SystemImgBytes" }
if ($missing.Count) { throw ("NOT INSTALLED: " + ($missing -join '; ')) }

# 6. One AVD, written by hand (avdmanager refuses an image sdkmanager did not register). Kept
#    inside $Root, not in the user profile. 2 GB of RAM: memory is the scarce resource here.
$AvdDir = Join-Path $AvdHome "$Avd.avd"
if (-not (Test-Path (Join-Path $AvdDir 'config.ini'))) {
  Say "writing AVD $Avd"
  New-Item -ItemType Directory -Force $AvdDir -ErrorAction Stop | Out-Null
  Set-Content -Path (Join-Path $AvdHome "$Avd.ini") -Encoding ascii -Value @(
    'avd.ini.encoding=UTF-8', "path=$AvdDir", "path.rel=avd\$Avd.avd", 'target=android-34')
  Set-Content -Path (Join-Path $AvdDir 'config.ini') -Encoding ascii -Value @(
    "AvdId=$Avd", 'PlayStore.enabled=false', 'abi.type=x86_64', "avd.ini.displayname=$Avd", 'avd.ini.encoding=UTF-8',
    'disk.dataPartition.size=6G', 'fastboot.forceColdBoot=yes', 'hw.accelerometer=yes', 'hw.audioInput=no', 'hw.audioOutput=no',
    'hw.battery=yes', 'hw.camera.back=emulated', 'hw.camera.front=emulated', 'hw.cpu.arch=x86_64', 'hw.cpu.ncore=4', 'hw.dPad=no',
    'hw.device.manufacturer=Google', 'hw.device.name=pixel_6', 'hw.gps=yes', 'hw.gpu.enabled=yes', 'hw.gpu.mode=host', 'hw.keyboard=yes',
    'hw.lcd.density=420', 'hw.lcd.height=2400', 'hw.lcd.width=1080', 'hw.mainKeys=no', 'hw.ramSize=2048', 'hw.sdCard=yes',
    'hw.sensors.orientation=yes', 'hw.sensors.proximity=yes', 'hw.trackBall=no',
    'image.sysdir.1=system-images\android-34\google_apis\x86_64\', 'runtime.network.latency=none', 'runtime.network.speed=full',
    'sdcard.size=512M', 'showDeviceFrame=no', 'skin.dynamic=yes', 'skin.name=1080x2400', 'skin.path=_no_skin',
    'tag.display=Google APIs', 'tag.id=google_apis', 'vm.heapSize=256')
}

# 7. Environment files (sourced on demand; nothing is added to the system PATH)
$u = ($Root -replace '\\', '/') -replace '^([A-Za-z]):', '/$1'
$u = '/' + $u.Substring(1, 1).ToLower() + $u.Substring(2)
$btDir = "build-tools/$bt"
$envSh = @"
# FixFlow Android toolchain (user folder; delete $Root to uninstall).
# Git Bash:  source ${u}/env.sh
export JAVA_HOME='$($Jdk -replace '\\','/')'
export ANDROID_HOME='$($Sdk -replace '\\','/')'
export ANDROID_SDK_ROOT="`$ANDROID_HOME"
export ANDROID_AVD_HOME='$($AvdHome -replace '\\','/')'
export FF_ADB='${u}/sdk/platform-tools/adb.exe'
export FF_APKSIGNER='${u}/sdk/${btDir}/apksigner.bat'
export FF_AAPT2='${u}/sdk/${btDir}/aapt2.exe'
export FF_EMULATOR='${u}/sdk/emulator/emulator.exe'
export FF_AVD='${Avd}'
export PATH="${u}/jdk-17/bin:${u}/sdk/platform-tools:${u}/sdk/${btDir}:${u}/sdk/emulator:`$PATH"
"@
Set-Content -Path (Join-Path $Root 'env.sh') -Value ($envSh -replace "`r`n", "`n") -Encoding ascii -NoNewline
$envPs = @"
# FixFlow Android toolchain (user folder; delete $Root to uninstall).  PowerShell:  . $Root\env.ps1
`$env:JAVA_HOME = '$Jdk'
`$env:ANDROID_HOME = '$Sdk'
`$env:ANDROID_SDK_ROOT = '$Sdk'
`$env:ANDROID_AVD_HOME = '$AvdHome'
`$env:PATH = '$Jdk\bin;$Sdk\platform-tools;$Sdk\build-tools\$bt;$Sdk\emulator;' + `$env:PATH
"@
Set-Content -Path (Join-Path $Root 'env.ps1') -Value $envPs -Encoding ascii

# 8. Facts, and what was blocked
# A file blocked in an earlier run is still absent now: re-check the two known ones so the list
# is true on every run, not only on the run that unpacked the archive.
foreach ($known in @((Join-Path $Sdk 'emulator\lib64\gles_angle\d3dcompiler_47.dll'))) {
  if (-not (Test-Path -LiteralPath $known) -and -not ($script:Blocked -match [regex]::Escape($known))) { $script:Blocked += "$known :: absent (blocked by the antivirus when the emulator was unpacked)" }
}
Set-Content -Path $BlockedFile -Encoding ascii -Value (@("# Files of the official archives that could not be created on this PC. Left absent on purpose.", "# Written $(Get-Date -Format 'yyyy-MM-dd HH:mm')") + $script:Blocked)
Say '--- installed'
Say ("adb:         " + ((& $Adb version | Select-Object -First 1) -join ''))
Say ("apksigner:   " + ((cmd /c "`"$ApkSigner`" --version 2>&1" | Select-Object -First 1) -join '') + "  (build-tools $bt)")
Say ("emulator:    " + ((cmd /c "`"$Emu`" -version 2>&1" | Select-String -Pattern 'emulator version' | Select-Object -First 1) -join ''))
Say ("accel:       " + ((cmd /c "`"$Emu`" -accel-check 2>&1" | Where-Object { $_ -and $_ -notmatch '^accel:?$' -and $_ -ne '0' } | Select-Object -First 1) -join ''))
Say ("system image: " + ((Get-Content (Join-Path $ImageDir 'source.properties') | Select-String -Pattern 'Pkg.Revision|AndroidVersion.ApiLevel' | ForEach-Object { $_.Line }) -join ', '))
Say ("avds:        " + ((cmd /c "`"$Emu`" -list-avds 2>nul") -join ', '))
Say ("blocked files: $($script:Blocked.Count) (listed in $BlockedFile)")
$size = (Get-ChildItem $Root -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
Say ("folder size: {0:N1} GB at {1}" -f ($size / 1GB), $Root)
Say 'INSTALL OK'
