# Supply Chain: Install and Build Scripts

## What it is

Package managers and build tools run arbitrary code as part of routine commands — `postinstall`, `prepare`, `preinstall` hooks, `setup.py` at install time, `Makefile` targets, CI workflow steps. These execute with the invoking user's privileges, often before a human or agent has read a single line of the package's actual source.

## Per-ecosystem: install without running scripts first

Bootstrap with scripts disabled, inspect what's pending, then approve only what's actually needed:

- **npm**: `npm install --ignore-scripts`, then review `npm run` targets and any `package.json` `scripts` block before re-running the specific one needed
- **pnpm**: scripts are blocked by default for new dependencies unless explicitly approved (`pnpm approve-builds`) — don't blanket-approve, approve per package
- **yarn**: `yarn install --ignore-scripts`
- **pip**: prefer packages with wheels over sdists that run `setup.py` at build time; use `--no-build-isolation` scrutiny and read `setup.py`/`pyproject.toml` build backends before installing from source
- **Any Makefile/shell-based build**: read the target before running it (`make install`, `./configure && make` can both shell out to arbitrary commands)

## Checklist

1. **Never run an install/build command against a repo you haven't reviewed without first disabling lifecycle scripts** for that ecosystem.
2. **Read a pending script's actual source before approving it** — the package name and description are not evidence of what the script does.
3. **Approve scripts per-package, not blanket-per-project.** A policy of "always allow scripts" defeats the purpose the first time one malicious package is mixed into an otherwise-trusted dependency tree.
4. **CI/build configs are scripts too** — a `.github/workflows/*.yml`, `Dockerfile`, or `devcontainer.json` that runs on open/push deserves the same read-before-run treatment as a shell script.

## Stop condition

Any lifecycle or build script that reaches the network, reads environment variables or credential files, or writes outside the project directory, found before being reviewed.

See `untrusted-repo.md` for handling the surrounding repository, and the `security-and-hardening` skill's "Supply-Chain Hygiene" section for choosing and pinning a package manager at the workspace level.
