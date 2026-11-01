#!/bin/zsh
# Double-click this file in Finder to preview the SIZER web edition.
# It needs Python 3 (built into macOS) or Node.js.
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
  exec python3 serve.py "$@"
elif command -v node >/dev/null 2>&1; then
  exec node serve.js "$@"
else
  echo "Python 3 or Node.js is required to run the local preview."
  echo "Install Python from https://www.python.org/downloads/ and try again."
  read -r "?Press Enter to close..."
  exit 1
fi
