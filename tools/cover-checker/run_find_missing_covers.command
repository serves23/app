#!/usr/bin/env bash
# Double-click runnable on macOS to launch the cover checker dialog.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/find_missing_covers.py"
