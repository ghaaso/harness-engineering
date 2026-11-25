#!/bin/sh
# harness-kit/setup.sh: the kit's set-up on macOS and Linux. It builds and runs the program kit-setup
# (harness-kit/rust/crates/kit-setup) with cargo; every argument goes to it:
#   sh harness-kit/setup.sh                       dry run: prints what it would do, changes nothing
#   sh harness-kit/setup.sh --apply [--fetch] [--project <folder>] [--no-usage-tool]
#   sh harness-kit/setup.sh --status | --remove [--project <folder>]
# Needs Rust (rustup) and git. Offline unless --fetch: nothing is downloaded and rustup installs no toolchain.
KIT=$(cd "$(dirname "$0")" && pwd) || exit 1
if ! command -v cargo >/dev/null 2>&1; then
  echo "setup: cargo was not found. Install Rust with rustup (https://rustup.rs: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh), open a new terminal, and run this again." >&2
  exit 1
fi
CARGO_TARGET_DIR="$KIT/rust/target"
export CARGO_TARGET_DIR
OFFLINE=--offline
for a in "$@"; do [ "$a" = "--fetch" ] && OFFLINE=; done
if [ -n "$OFFLINE" ]; then RUSTUP_AUTO_INSTALL=0; export RUSTUP_AUTO_INSTALL; fi
cargo run --release --locked $OFFLINE --manifest-path "$KIT/rust/Cargo.toml" -p kit-setup -- "$@"
code=$?
if [ "$code" = 101 ] && [ -n "$OFFLINE" ]; then
  echo "setup: cargo could not build the set-up offline (a crate or the pinned Rust toolchain is not on this machine). Run again with --apply --fetch to let cargo download the crates harness-kit/rust/Cargo.lock names (from crates.io) and rustup the toolchain." >&2
fi
exit "$code"
