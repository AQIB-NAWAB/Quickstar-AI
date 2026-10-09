# Repository incident audit — 2026-10-10

## Verified evidence

Remote hashes read directly from GitHub over SSH:

| Branch | Observed tip | Static inspection |
| --- | --- | --- |
| main | bb93700d993785c77da1f06c85544890d6326eac | No observed injection markers in inspected tracked blobs |
| aqib | 6d91da4510adf19f513dd41034b448b3594d0e35 | 26 files with payload, execution, or editor autorun indicators |
| hashir | 12b2b3ead6da8891b2ca088906bb3e44fde86f72 | 30 files with payload, execution, or editor autorun indicators |
| local frontend baseline | f735fa1 | No observed injection markers in inspected tracked blobs |

Fetching confirmed non-fast-forward updates of both aqib and hashir relative to the previously cached refs. The cached main ref matched the live remote main tip.

The infected hashir tip replaces f735fa1 with a commit sharing its title and author identity. The infected aqib tip similarly replaces 74aa15c. Git author/committer fields do not identify the authenticated pusher. The supplied GitHub notifications attribute hashir force pushes to Abdul-Moiz31; API timeline/audit-log access is required to independently verify actors and all earlier pushes. The earlier notification commits have not yet been retrieved.

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

Recover aqib from the reviewed 74aa15c tree with a normal recovery commit after preserving evidence and checking for legitimate later work. Do not blindly reset it from this frontend task. No remote owner permissions or credentials were changed by this audit.

## Validation

Frontend TypeScript checking and Next.js production build passed. The integrity checker accepts the clean baseline and main and rejects both infected remote tips, including disguised binary-extension payloads. Staged whitespace was checked.
