# Past Trace

Past Trace is a high-hand memory-information variant. It reserves a public trace payload for previous-hand information.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Current single-hand state has no persisted previous hand, so `modeInfo` reports that no trace exists yet.
- Multi-round trace persistence remains a future state-extension follow-up.
