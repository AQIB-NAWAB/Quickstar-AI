#!/usr/bin/env python3
"""Reject observed incident signatures in tracked blobs without executing them."""
import re
import subprocess
import sys

ref = sys.argv[1] if len(sys.argv) > 1 else None
patterns = [
    re.compile(rb"global\s*\[\s*['\"]!['\"]\s*\]"),
    re.compile(rb"function\s+_0x[0-9a-f]+\s*\("),
    re.compile(rb"node\s+(?:\./)?api\.js"),
    re.compile(rb"fa-solid-900\.eot"),
    re.compile(rb'"runOn"\s*:\s*"folderOpen"'),
]
# Inspect the index by default, so unstaged changes cannot conceal staged payloads.
paths = subprocess.check_output(
    ["git", "ls-tree", "-r", "--name-only", "-z", ref] if ref
    else ["git", "ls-files", "-z"]
).split(b"\0")
failed = []
for raw in paths:
    if not raw:
        continue
    path = raw.decode()
    # Incident evidence documentation contains filenames intentionally.
    if path == "docs/security/repository-incident-2026-10-10.md":
        continue
    data = subprocess.check_output(["git", "show", f"{ref}:{path}" if ref else f":{path}"])
    if any(pattern.search(data) for pattern in patterns):
        failed.append(path)
if failed:
    print("Incident indicators detected:", *failed, sep="\n")
    sys.exit(1)
print("No observed incident signatures found in tracked blobs.")
