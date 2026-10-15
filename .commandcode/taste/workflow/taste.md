# Workflow

- Drives work from the roadmap file: pull the latest `main` from remote, update the local working branch (e.g. `aqib`) from `main` before starting, then read the roadmap to pick the next task. Repeats this at the start of nearly every session. Confidence: 0.9
- Works feature-by-feature and wants end-to-end features (frontend + backend together) rather than only one layer. Confidence: 0.75
- Wants a proper plan before implementation ("please plan proper to work on it") and expects the assistant to ask clarifying questions / flag anything missing (env vars, credentials, provider keys) instead of guessing. Confidence: 0.85
- Expects work to end with commit, push, and a PR — very frequently asks "push the code and create a PR" / "create PR please". Confidence: 0.9
- Expects the agent to actually run things itself: start/restart the whole project, run builds and commands, use its terminal access, and re-run/rebuild whenever needed without asking permission ("you have the terminal access, just please run the commands", "everytime if you need run something just do it"). Confidence: 0.85
- Wants to test features himself in a real environment — asks for the frontend port, a temporary sample `index.html` in a real browser, running the widget, running the project in the background. Confidence: 0.75
- Prefers realistic end-to-end verification with seeded accounts/data (run the seeder, then exercise real flows and keep fixing until it works) instead of toy/stub checks. Confidence: 0.7
- When something breaks, expects the agent to check logs, find the root cause, fix it, and report what env/config was needed. Confidence: 0.7
