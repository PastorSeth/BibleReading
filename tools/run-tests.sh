#!/usr/bin/env bash
# Runs the in-browser test page in headless Chrome and prints the results.
# Usage: tools/run-tests.sh            (from anywhere)
# Exit status is 0 only when every test passed and there were no load errors.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
port=8790
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

started=""
if ! curl -s -o /dev/null "http://localhost:$port/"; then
  (cd "$root" && exec python3 -m http.server "$port" >/dev/null 2>&1) &
  started=$!
  disown "$started"
  for _ in $(seq 1 50); do curl -s -o /dev/null "http://localhost:$port/" && break; sleep 0.1; done
fi

profile="$(mktemp -d)"
cleanup() { [ -n "$started" ] && kill "$started" 2>/dev/null; rm -rf "$profile"; }
trap cleanup EXIT

dom="$("$chrome" --headless=new --disable-gpu --no-first-run --user-data-dir="$profile" \
  --virtual-time-budget=20000 --dump-dom "http://localhost:$port/tests/" 2>/dev/null)"

printf '%s' "$dom" | python3 -I -c '
import sys, re, html
dom = sys.stdin.read()
m = re.search(r"<pre id=\"results\">(.*?)</pre>", dom, re.S)
if not m:
    print("could not find test results in the page"); sys.exit(1)
rows = [html.unescape(re.sub(r"<[^>]+>", "", r)) for r in re.findall(r"<div[^>]*>(.*?)</div>", m.group(1), re.S)]
if not rows:
    print(html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()); sys.exit(1)
for r in rows[:-1]:
    if not r.startswith("PASS "):
        print(r)
summary = rows[-1]
print(summary)
mm = re.match(r"(\d+) passed, (\d+) failed", summary)
sys.exit(0 if mm and mm.group(2) == "0" and int(mm.group(1)) > 0 else 1)
'
