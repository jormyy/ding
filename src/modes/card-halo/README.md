# Card Halo

Card Halo is a high-hand rank-aura variant. Neighboring ranks can form a pair aura.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Reuses `syntheticPair: "adjacent"` so adjacent ranks can create a synthetic pair at showdown.
- No phase mutation is needed.
