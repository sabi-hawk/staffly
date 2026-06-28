# Git & Delivery — Softonoma Employee Portal

Lightweight and solo-friendly. No per-task worktrees, no FRD/PR ceremony unless asked.

## Identity (local to this repo only)
`sabi-hawk <miansabby516@gmail.com>` — already configured via `git config` (not `--global`).
Remote uses the personal SSH alias: `git@github-personal:sabi-hawk/staffly.git`.

## Flow
- Commit **per logical slice/phase** with a clear, multi-line message. Work goes directly on
  `main` (this is the owner's solo project; no branch ceremony needed unless the owner asks).
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Push only when the owner asks** (they have been asking each round). Pushing uses
  `GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new" git push origin main`.
- Never commit secrets / `CREDENTIALS.md` (git-ignored + hook-blocked).

## Before committing
Run the gate (see `.claude/rules/testing.md`): `tsc` clean, `npm run build` green,
`npm run report` all-PASS, screens verified. Update the KB in the same change.

## When the owner wants more rigor (optional, not default)
For a risky/large change they can ask for a feature branch + a GitHub compare URL to self-merge.
Worktrees (`git worktree`) are available if multiple changes run in parallel — not used by default.
