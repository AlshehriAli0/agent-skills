#!/usr/bin/env python3
"""
audit_legend_state.py — flag deprecated / anti-pattern Legend-State (v3) usage.

Heuristic, grep-style scan of a codebase. Hits are "review this", not guaranteed errors.
Reasoning for each rule is in references/migration-and-gotchas.md.

Usage:
    python audit_legend_state.py <path>            # scan a dir or file
    python audit_legend_state.py <path> --json     # machine-readable output

Exit code is 0 always (it's an advisory tool); use --strict to exit 1 when findings exist.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

EXTS = {".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".expo", "coverage", "ios", "android"}

# Each rule: (id, severity, compiled regex, message). Line-level regexes.
LINE_RULES = [
    ("use-selector", "warn", re.compile(r"\buseSelector\s*\("),
     "useSelector is renamed to useValue in v3."),
    ("use-dollar", "warn", re.compile(r"\buse\$\s*\("),
     "use$ is an old name for useValue and is NOT React-Compiler-safe. Use useValue."),
    ("computed-fn", "warn", re.compile(r"\bcomputed\s*\("),
     "computed() is gone in v3 — use a function inside the observable, or observable(() => ...)."),
    ("persist-observable", "warn", re.compile(r"\bpersistObservable\s*\("),
     "persistObservable is v2 — use syncObservable(state$, { persist: { name } })."),
    ("configure-persistence", "warn", re.compile(r"\bconfigureObservablePersistence\s*\("),
     "configureObservablePersistence is v2 — use configureSynced({ persist: { plugin } })."),
    ("enable-react-tracking-auto", "warn", re.compile(r"enableReactTracking\s*\(\s*\{[^}]*auto\s*:"),
     "enableReactTracking({ auto: true }) is deprecated and broken in React 19."),
    ("reactive-namespace", "info", re.compile(r"\bReactive\.(div|span|input|View|Text|TextInput)\b"),
     "Reactive.* moved to $React.* (web) or $View/$Text/$TextInput (RN) in v3."),
    ("legend-namespace", "info", re.compile(r"<Legend\."),
     "<Legend.*> components are replaced by $React.* (web) / $-prefixed RN components."),
    ("for-item-prop", "info", re.compile(r"<For\b[^>]*\bitem\s*=\s*\{(?!\s*\(\s*\{\s*item\$)"),
     "For's row prop is item$ in v3; the render component should receive { item$ }."),
    ("on-set", "info", re.compile(r"\.onSet\s*\("),
     "onSet was renamed to onAfterSet in v3."),
    ("after-batch", "info", re.compile(r"\bafterBatch\s*\("),
     "afterBatch is removed — pass a completion callback: batch(fn, onComplete)."),
]

# Spread-then-set clone anti-pattern, e.g.  list$.set([...list$.get(), x])  or  x$.set({ ...x$.get() ... })
CLONE_SET = re.compile(r"\.set\s*\(\s*[\[{]\s*\.\.\.")

# Direct object assignment to a $-suffixed node:  foo$.bar = {   (primitives are sometimes allowed, but flag obj)
DIRECT_ASSIGN = re.compile(r"\b\w*\$(?:\.\w+|\[[^\]]+\])+\s*=\s*[^=]")

IMPORT_LEGEND = re.compile(r"from\s+['\"]@legendapp/state")
OBSERVER_USE = re.compile(r"\bobserver\s*\(")
GET_CALL = re.compile(r"\.get\s*\(\s*\)")
USE_VALUE = re.compile(r"\buseValue\s*\(")


def iter_files(root: str):
    if os.path.isfile(root):
        yield root
        return
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if os.path.splitext(fn)[1] in EXTS:
                yield os.path.join(dirpath, fn)


def scan_file(path: str):
    findings = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            lines = fh.readlines()
    except OSError:
        return findings

    text = "".join(lines)
    uses_legend = bool(IMPORT_LEGEND.search(text))
    file_uses_observer = bool(OBSERVER_USE.search(text))
    file_uses_use_value = bool(USE_VALUE.search(text))

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*"):
            continue

        for rule_id, sev, rx, msg in LINE_RULES:
            if rx.search(line):
                findings.append((i, sev, rule_id, msg))

        if CLONE_SET.search(line):
            findings.append((i, "warn", "clone-then-set",
                             "Cloning to update (spread + set). Mutate directly: push()/targeted set()/delete()."))

        # Only flag direct assignment in files that actually use Legend-State, to cut noise.
        if uses_legend and DIRECT_ASSIGN.search(line) and "===" not in line and "!=" not in line \
                and "=>" not in line and ">=" not in line and "<=" not in line:
            findings.append((i, "info", "direct-assign",
                             "Possible direct assignment to an observable node. Use .set()/.assign()."))

    # File-level heuristic: observer + .get() and no useValue suggests the deprecated pre-beta.20 pattern.
    if uses_legend and file_uses_observer and GET_CALL.search(text) and not file_uses_use_value:
        findings.append((0, "warn", "observer-get",
                         "File uses observer() with .get() and no useValue — likely the deprecated v3 pattern. "
                         "Read with useValue (observer is now just an optimization)."))

    return findings


def main():
    ap = argparse.ArgumentParser(description="Audit a codebase for deprecated/anti-pattern Legend-State usage.")
    ap.add_argument("path", help="File or directory to scan")
    ap.add_argument("--json", action="store_true", help="Output JSON")
    ap.add_argument("--strict", action="store_true", help="Exit 1 if any findings")
    args = ap.parse_args()

    if not os.path.exists(args.path):
        print(f"path not found: {args.path}", file=sys.stderr)
        sys.exit(2)

    results = {}
    total = 0
    for path in iter_files(args.path):
        f = scan_file(path)
        if f:
            results[path] = f
            total += len(f)

    if args.json:
        out = {
            p: [{"line": ln, "severity": sev, "rule": rid, "message": msg} for (ln, sev, rid, msg) in items]
            for p, items in results.items()
        }
        print(json.dumps({"total": total, "files": out}, indent=2))
    else:
        if total == 0:
            print("✅ No deprecated/anti-pattern Legend-State usage found.")
        else:
            sev_order = {"warn": 0, "info": 1}
            for path in sorted(results):
                print(f"\n{path}")
                for ln, sev, rid, msg in sorted(results[path], key=lambda x: (x[0], sev_order.get(x[1], 9))):
                    loc = f"  {ln}:" if ln else "  (file):"
                    tag = "WARN" if sev == "warn" else "info"
                    print(f"{loc:>8} [{tag}] {rid} — {msg}")
            warns = sum(1 for items in results.values() for it in items if it[1] == "warn")
            print(f"\n{total} finding(s) across {len(results)} file(s) — {warns} warn, {total - warns} info.")
            print("Heuristic results; confirm against references/migration-and-gotchas.md before changing code.")

    sys.exit(1 if (args.strict and total) else 0)


if __name__ == "__main__":
    main()
