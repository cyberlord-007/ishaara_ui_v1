---
name: commit
description: Commit currently staged changes only, with a short descriptive message and no co-author trailer. Use when the user asks to commit, says "commit this" or "commit staged changes", or invokes /commit.
---

# Commit staged changes

Commit **only what is already staged**. Never stage anything on the user's behalf and never commit unstaged work.

## Steps

1. Run `git status` and `git diff --cached` to see exactly what is staged.
   - If nothing is staged, stop and tell the user — ask them to stage files first. Do not run `git add` for them, and do not fall back to `git commit -a`.
2. Run `git log -8 --oneline` to see the repo's existing commit message style and match it (for example, this repo commits milestones as `feat(fN): <summary>` per `docs/implementation_plan.md` — use that form when the staged change corresponds to a plan milestone; otherwise use a plain, short, imperative subject line).
3. Draft a commit message that is short (a single subject line, aim for under ~60–72 characters) but descriptive of *why* the change was made, not a restatement of the diff. Add a body only if the subject genuinely can't carry the needed context — keep it to 1–2 sentences.
4. Commit with a plain message, passed via heredoc to preserve formatting:
   ```bash
   git commit -m "$(cat <<'EOF'
   <subject line>

   <optional 1-2 sentence body>
   EOF
   )"
   ```
   - Do **not** add a `Co-Authored-By:` line or any other trailer.
   - Do **not** pass `--no-verify`, `--no-gpg-sign`, or otherwise skip hooks/signing.
   - Do **not** use `--amend` unless the user explicitly asks for it.
5. Run `git status` afterward to confirm the commit succeeded and report back concisely (short hash + subject).

## Rules

- Never run `git add` — only commit what's already in the index.
- Never use `-a`/`--all` on `git commit`.
- Never add `Co-Authored-By` or any other trailer to the message.
- Keep the message short but descriptive: what changed and why, not a changelog of every file touched.
- If the staged changes mix unrelated concerns, say so and ask whether to split into separate commits rather than writing one message that papers over it.
