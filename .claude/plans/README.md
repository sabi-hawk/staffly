# Plans — optional, lightweight

Most work on this portal comes from the owner in chat and is small enough to just do (capture it in
`../knowledgebase/06-requirements-changelog.md` and go — see the `feature-workflow` skill). **Plans
are optional** and only worth it for a multi-step initiative the owner wants tracked across sessions.

No FRDs, no heavy templates. A plan is just a folder; its **lifecycle is the folder it sits in**:

```
plans/
├── backlog/      ← captured but parked (not scheduled)
├── upcoming/     ← agreed, not started
├── inprogress/   ← active; has a tasks.md checklist
└── done/         ← shipped record
```

## Shape of a plan folder (`NN-short-name/`)
- `plan.md` — one page: what/why, the approach, key files, and how to verify. (That's it — no FRD.)
- `tasks.md` (when in `inprogress/`) — a `- [ ] / - [x]` checklist with a short note on completion
  (commit/key file/decision). Keep it current so a resuming agent never loses context.

## Rules
- **Move, don't copy** — a plan lives in exactly one folder (its status is unambiguous).
- When a plan completes, fold its durable knowledge into `../knowledgebase/<module>` +
  `../database/database.md`, then move the folder to `done/`.
- No secrets / no PII in any plan doc.
