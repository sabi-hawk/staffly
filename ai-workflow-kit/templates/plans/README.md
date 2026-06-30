# Plans — optional, lightweight

Most work comes from the owner in chat and is small enough to just do (capture it in the knowledge
base and go — see the `feature-workflow` skill). **Plans are optional**, only worth it for a
multi-step initiative worth tracking across sessions.

A plan is a folder; its **lifecycle is the folder it sits in**:
```
plans/
├── backlog/      ← captured but parked (not scheduled)
├── upcoming/     ← agreed, not started
├── inprogress/   ← active; has a tasks.md checklist
└── done/         ← shipped record
```

> For **large, multi-module initiatives**, a plan is preceded by an **FRD** — the agreed per-module
> requirements spec in `../knowledgebase/frds/`. A plan is promoted from an **Approved** FRD and links
> back to it. Small/mid changes go straight to a plan (or just get built). See `../knowledgebase/frds/README.md`.

## Shape (`NN-short-name/`)
- `plan.md` — one page: what/why, approach, key files, how to verify. (For an FRD-backed module, link
  the FRD instead of repeating its requirements.)
- `tasks.md` (while `inprogress/`) — a `- [ ] / - [x]` checklist; note completion (commit/file/decision). Keep it current.

## Rules
- **Move, don't copy** — a plan lives in exactly one folder.
- On completion, fold durable knowledge into the knowledge base + database index, then move to `done/`.
- No secrets / no PII in any plan doc.
