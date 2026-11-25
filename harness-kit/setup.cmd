@echo off
rem harness-kit\setup.cmd: the kit's set-up on Windows. It builds and runs the program kit-setup
rem (harness-kit\rust\crates\kit-setup) with cargo; every argument goes to it:
rem   harness-kit\setup.cmd                       dry run: prints what it would do, changes nothing
rem   harness-kit\setup.cmd --apply [--fetch] [--project <folder>] [--no-usage-tool]
rem   harness-kit\setup.cmd --status   or   --remove   [--project <folder>]
rem Needs Rust (rustup) and git. Offline unless --fetch: nothing is downloaded and rustup installs no toolchain.
setlocal
set "KIT=%~dp0"
set "KIT=%KIT:~0,-1%"
where cargo >nul 2>nul
if errorlevel 1 goto nocargo
set "CARGO_TARGET_DIR=%KIT%\rust\target"
set "OFFLINE=--offline"
for %%a in (%*) do if /i "%%~a"=="--fetch" set "OFFLINE="
if defined OFFLINE set "RUSTUP_AUTO_INSTALL=0"
cargo run --release --locked %OFFLINE% --manifest-path "%KIT%\rust\Cargo.toml" -p kit-setup -- %*
set "CODE=%ERRORLEVEL%"
if "%CODE%"=="101" if defined OFFLINE echo setup: cargo could not build the set-up offline: a crate or the pinned Rust toolchain is not on this machine. Run again with --apply --fetch to let cargo download the crates harness-kit\rust\Cargo.lock names, from crates.io, and rustup the toolchain. 1>&2
exit /b %CODE%
:nocargo
echo setup: cargo was not found. Install Rust with rustup from https://rustup.rs, open a new terminal, and run this again. 1>&2
exit /b 1
