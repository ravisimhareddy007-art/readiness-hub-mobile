#!/usr/bin/env bash
# ReadiNes regression gate. Run from repo root: bash scripts/regress.sh
# Fails on: type errors, build errors, failing unit fixtures, or any banned pattern below.
set -u
cd "$(dirname "$0")/.."
status=0
step() { printf '\n== %s ==\n' "$1"; }

step "typecheck"
npx tsc --noEmit || status=1

step "unit fixtures"
node --experimental-strip-types tests/wealth.test.mjs 2>&1 | grep -v ExperimentalWarning || status=1

step "banned patterns"
ban() { # $1 = description, $2 = grep -E pattern, $3.. = files
  local desc="$1" pat="$2"; shift 2
  local hits
  hits=$(grep -nE "$pat" "$@" 2>/dev/null)
  if [ -n "$hits" ]; then printf 'FAIL %s\n%s\n' "$desc" "$hits"; status=1; else printf 'ok   %s\n' "$desc"; fi
}
SRC=$(find src -name '*.ts' -o -name '*.tsx' | grep -v 'src/components/Landing.tsx')   # Landing is the marketing web page, not app UI
APP=$(echo "$SRC" | grep -v 'src/lib/currency.ts')                                          # currency.ts holds the one legitimate locale fallback
ban "hard-coded locale (use fmtDate / undefined)"        '"en-US"|"en-GB"'                        $APP
ban "hard-coded dollar formatting (use formatMoney)"    '`\$\$\{|"\$" \+|\$\$\{\('               $SRC
ban "font size below 12px"                              'fontSize: (10|11)(\.[0-9])?[,} ]'       $SRC
ban "gold used on warning icon (use SEM.warning)"       'AlertTriangle[^/]*color=\{T\.gold\}'    $SRC
ban "Tax documents offered as Wealth holdings"          '"Property", "Tax"\]'                    $SRC

step "release blockers (listed, not failing yet)"
grep -nE "DEV ONLY" $SRC || echo "ok   none"

step "production build"
npx vite build >/tmp/regress-build.log 2>&1 && echo "ok   build" || { status=1; echo "FAIL build"; tail -20 /tmp/regress-build.log; }

printf '\n== result: %s ==\n' "$([ $status -eq 0 ] && echo PASS || echo FAIL)"
exit $status
