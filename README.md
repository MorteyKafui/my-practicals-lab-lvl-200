# Physics Bench

A virtual 3D physics practicals lab. Students perform practicals on an interactive bench (or bring
their own lab data), record their own readings, plot their own graph, get feedback on what went
wrong, and only then compare with accepted values and generate a lab report in the 15-section format.
Offline-first PWA; work is saved on the device.

## Develop

```sh
bun install
bun run dev          # http://localhost:3000
bun run test         # unit + golden-dataset tests (bun test)
bun run typecheck && bun run lint
bun run build        # static export to out/ + offline service worker
bun run preview      # serve out/ on http://localhost:4173
bunx playwright test # end-to-end (needs the build and Chrome)
```

## Branches

Every new feature lands on `QA` first; `master` is updated from `QA` once it has been checked.

## Adding a practical

Follow `.claude/skills/add-experiment/SKILL.md`. Each practical is a plugin in `experiments/<id>/`.

## Agent skills used in this project

Third-party skills are not committed; reinstall them with:

```sh
bunx skills add wheresryan22/anatomy --agent claude-code -y
bunx skills add Leonxlnx/taste-skill --skill design-taste-frontend --agent claude-code -y
```
