# Card Inheritance

Card Inheritance is a high-hand discard-inheritance variant. Discards inherit from the board before disappearing.

## Engine Notes

- Deals three hole cards and automatically keeps two.
- Uses `modeInfo` to surface the inheritance rule.
- True disappearing-discard value mutation is deferred.
