# Repository incident audit — 2026-10-10

## Verified evidence

Remote hashes read directly from GitHub over SSH:

| Branch | Observed tip | Static inspection |
| --- | --- | --- |
| main | bb93700d993785c77da1f06c85544890d6326eac | No observed injection markers in inspected tracked blobs |
| aqib (pre-recovery) | 6d91da4510adf19f513dd41034b448b3594d0e35 | 26 files with payload, execution, or editor autorun indicators |
| hashir (pre-recovery) | 12b2b3ead6da8891b2ca088906bb3e44fde86f72 | 30 files with payload, execution, or editor autorun indicators |
| local frontend baseline | f735fa1 | No observed injection markers in inspected tracked blobs |

Fetching confirmed non-fast-forward updates of both aqib and hashir relative to the previously cached refs. The cached main ref matched the live remote main tip.

The infected hashir tip replaces f735fa1 with a commit sharing its title and author identity. The infected aqib tip similarly replaces 74aa15c. Git author/committer fields do not identify the authenticated pusher. The supplied GitHub notifications attribute hashir force pushes to Abdul-Moiz31; API timeline/audit-log access is required to independently verify actors and all earlier pushes. The previous notification commit 2d5f915f55f1ae942b264a101aa4e161be6ef923 was also retrieved: it contains injected PostCSS configuration, editor autorun, and JavaScript disguised as fa-solid-900.woff2 (four flagged files). Comparing it to 12b2b3e shows expansion into api.js and service startup scripts and replacement of the disguised font payload. The abbreviated 2e5a79c commit has not been retrieved.

## Injection mechanisms

- Obfuscated JavaScript appended to fake `api.js` modules in backend services; hashir also includes apps/web/api.js.
- Service dev/start scripts modified to run `node api.js` before the legitimate application.
- Obfuscated payload appended to eslint.config.js on aqib, and apps/web/postcss.config.mjs on hashir: lint/build can execute code during configuration loading.
- JavaScript disguised as fa-solid-900.eot, placed under nested public/fonts directories.
- .vscode/tasks.json launches the disguised payload on folder open, hides its terminal, and labels the task eslint-check. Settings permit automatic tasks.
- .gitignore removes environment-file and editor-settings exclusions and adds config.bat. This increases accidental secret-commit exposure.
- Widespread line-ending changes obscure substantive differences; comparisons must ignore carriage-return changes.

No payload was executed or dynamically deobfuscated. Static inspection establishes malicious execution mechanisms, but does not establish the full payload behavior, exfiltration targets, or whether any particular computer executed it. This is a targeted repository audit, not endpoint forensics or proof that no other compromise exists.

## Recovery

Preserve the clean local frontend and reconstruct the working tree from its baseline rather than merging infected content. Use a normal recovery merge retaining the compromised tip as a parent while selecting the independently inspected clean tree. This permits a fast-forward update of hashir without force pushing and keeps the incident reachable for investigation. Do not merge origin/aqib into main before owner recovery.

A repository tree check rejects the observed execution and obfuscation patterns and scans binary extensions for these JavaScript markers. This check is defense in depth; an attacker who retains write access can remove it.

## Owner action requested

@AQIB-NAWAB: investigate authenticated push activity and permissions; suspend access from suspected compromised accounts/credentials while investigating; revoke affected tokens, SSH/deploy keys, and sessions; examine installed apps and webhooks. Protect main, aqib, and hashir with review requirements, no force pushes, and appropriately restricted bypass actors. Audit CI runs triggered from infected branches. Any workstation that opened those branches or ran lint/build/dev/start needs endpoint investigation and credential rotation from a clean device. Rotate reachable repository/application/CI secrets if execution or exposure is suspected.

Recover aqib from the reviewed 74aa15c tree with a normal recovery commit after preserving evidence and checking for legitimate later work. No remote owner permissions or credentials were changed by this audit.

## Validation

Frontend TypeScript checking and Next.js production build passed. The integrity checker accepts the clean baseline and main and rejects both infected remote tips, including disguised binary-extension payloads. Staged whitespace was checked.

## Published recovery

Recovery merge de8afc188f68a0939ba92a9481e1b4745a98b508 followed by b85a9349ea4c29a58b69859be6dcf715ea1572c5 was pushed normally to hashir and verified by a fresh remote-ref read. Automated integrity checks (`scripts/check-repository-integrity.py`) were expanded and integrated into `package.json` (`pnpm run integrity`) and root `Makefile` (`make integrity`). Full frontend validation (Next.js production build, TypeScript verification, staged whitespace check) passed cleanly. Recovery PR #41 merged hashir recovery into main.

**aqib recovery (closes #42):** A recovery merge on `aqib` retains compromised tip `6d91da4` as history while restoring the independently reviewed `74aa15c` tree (no observed injection markers). Post-recovery `origin/aqib` passes `scripts/check-repository-integrity.py`. `main` was already clean at merge of #41; do not merge pre-recovery `origin/aqib` into `main`.
