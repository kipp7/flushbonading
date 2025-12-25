# Offline Verification

PinForge is offline-first.

## Runtime
- The app must function with network disconnected:
  - MCU selection
  - sensor selection
  - allocation + conflicts
  - exports
  - project save/load

## Development
- Use `npm run check:offline` to verify no required network calls are introduced.
