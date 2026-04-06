---
name: post-push-brief
description: >-
  Pushes git changes safely (status, diff, commit, push) then produces a short
  plain-language bullet summary for non-technical teammates. Use when the user
  asks to push to git, share an update with the team, write a stakeholder brief
  after a push, or run the post-push workflow.
---

# Post-push + stakeholder brief

## Git workflow

1. Show `git status` and a concise summary of what changed (uncommitted vs ahead of remote).
2. If the user did not specify commit scope: stage what they intend (or ask once: all vs specific paths). Prefer focused commits.
3. Propose a **clear commit message** (imperative mood, ≤72 char subject if possible; optional body for *why*).
4. After commit: push the current branch (`git push` or `git push -u origin <branch>` if no upstream).
5. If push fails: report error, suggest next step (pull/rebase, auth, branch protection); do not guess destructive history rewrites unless the user asks.

## Before pushing (when reasonable)

- Run `npm run build` (or the project’s usual check) if changes touched app code and CI usually runs it.
- Do not skip hooks unless the user explicitly requests it.

## Stakeholder brief (after successful push)

Output **below** the git result. Audience: people who don’t read code.

**Rules**

- **Bullets only** (5–10 lines max unless the user asks for more).
- **Plain English**: outcomes and behavior, not file names, libraries, or stack jargon.
- **No internal IDs**: skip PR numbers unless the user wants them in Slack/email.
- **Tone**: factual, past tense for what shipped (“Added…”, “Fixed…”).

**Template**

- **What changed:** one or two bullets on user-visible behavior or capability.
- **Why it matters:** optional single bullet if non-obvious.
- **How to try it:** where in the app to click or what scenario to run (if applicable).
- **Heads-up:** regressions or follow-ups only if real.

If there is nothing user-visible (e.g. chore, docs-only), say so in one bullet and skip hype.

## Example brief (shape only)

```text
• Improved the board rim so jail/tax stripes show correctly in tile pickers.
• Rim tiles are slightly taller with a neutral frame; corner colors connect better at the corners.
• Open the game board / picker overlays to confirm stripes and corners look right.
```
