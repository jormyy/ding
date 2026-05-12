# Late Hand Reveal

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `late-hand-reveal`

## What Changed

- Added the mode definition.
- Registered river-only full-hole-card reveal.

## Evidence

- Unit coverage proves turn stays private and river exposes both hole cards.
