# Counterfeit

Counterfeit is a high-hand card-metadata variant. One hole card per hand has value zero.

## Engine Notes

- Uses `counterfeitHoleCards: 1` to mark the first kept hole card in every hand with `meta: "counterfeit"`.
- Uses `excludedMetas: ["counterfeit"]` so counterfeit cards are ignored by showdown scoring.
- The card remains visible to its owner, but it contributes no evaluator identity.
