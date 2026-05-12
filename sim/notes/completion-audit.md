# Ding 200-Mode Completion Audit

Captured: 2026-05-12

## Objective

Ship Ding's 200-game-mode catalogue while preserving cooperative ranking rules, keeping modes playable in real rooms, documenting each mode, and replacing the lobby selector with a catalogue-scale UI. The user explicitly relaxed validation from one manual agent-browser playthrough per mode to an accelerated implementation/static gate plus sampled browser smoke.

## Evidence

- Mode catalogue: `src/lib/gameModes.ts` exposes 206 definitions. This covers the 200-item prompt as 199 unique mode IDs because `vault-card` appears twice in the prompt, plus 7 pre-existing/non-catalogue variants: `draw-three`, `lowball`, `flush-hunt`, `straight-hunt`, `pair-party`, `red-shift`, `black-ice`.
- Per-mode docs: `src/modes/*/README.md` exists for all 206 visible definitions.
- Per-mode notes: `sim/notes/*.md` exists for all 206 visible definitions.
- Browser screenshots: `sim/screens/*` covers the early serial browser-tested modes, `sim/screens/lobby-mode-selector/`, and the sampled catalogue canary modes. It does not cover every accelerated mode.
- Static gates: latest green commands were `npx tsc --noEmit`, `npm run test:run` (262 tests), `npm run build`, and `git diff --check`.
- Lobby selector: `src/components/Lobby.tsx` now has tier tabs, axis filters, searchable grid cards, recent/favorites, detail panel on desktop, collapsed layout at 720px, keyboard navigation, and Surprise Me. Focused browser smoke captured `sim/screens/lobby-mode-selector/desktop.png` and `sim/screens/lobby-mode-selector/viewport-720.png`.
- Sampled catalogue canary: `scripts/runBrowserCanarySample.ts` created fresh browser-visible rooms and `scripts/browserCanary.ts` drove a second human seat through real PartyKit WebSockets for `players-choice` (deal-choice), `smoke-hole` (visibility), `lightning` (event), `jokers-in` (wild/identity), and `pandemonium` (insanity). Each reached reveal with non-null score and screenshots under `sim/screens/<mode-id>/`; each has `canary.json` evidence.
- Deployment checklist: `AGENTS.md` now requires a sampled 5-mode agent-browser catalogue canary and marks simulateFast as informational while bot repairs remain out of scope.
- Chaos events: phase effects now emit typed `chaos-event` server messages, append system audit entries into `botActionLog`, and render animated client toasts via the shared notification layer.

## Missing Before Goal Completion

- Per-mode screenshots for the accelerated modes are intentionally absent under the user's speed-up direction. This is acceptable only if the sampled browser canary remains the agreed replacement gate.
- Several accelerated modes intentionally use deterministic or approximate semantics documented in their notes, especially random chaos targeting, exact per-viewer/private hint displays, voting, true mid-game fork selection, and Pandemonium's random mode sampling.
- Many phase effects still use deterministic first-pass targets and public info surfaces rather than exact random/private semantics.

## Current Verdict

Not complete against the original unrelaxed codex because several accelerated modes intentionally use deterministic or approximate semantics. Complete against the user's accelerated validation policy for catalogue coverage, documentation, scalable lobby selection, typed chaos-event surfacing, static gates, and sampled browser smoke.
