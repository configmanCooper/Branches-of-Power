# Plan 5: Add Host Migration for Multiplayer

## Problem
If the host disconnects, ALL other players lose the game permanently. No recovery possible.

## Approach

### 5.1 Store State Snapshots on Clients
**File:** `network.js`
**Change:** Clients store `lastKnownState` from every `HOST_STATE_UPDATE`.

### 5.2 Host Disconnect Detection + Migration
**File:** `network.js`
**Change:** On host disconnect, remaining clients elect new host (lowest alphabetical peerId). New host loads saved state into Engine, creates new PeerJS peer with same room code. Others reconnect.

> ⚠️ **AUDIT: Critical issues with this step.**
> - Client peer IDs are random strings (`'bop-player-' + Math.random().toString(36).substr(2, 8)` — see `joinGame()`, line 302), so "lowest alphabetical peerId" is arbitrary and non-deterministic across clients. Use a deterministic order instead, e.g., join order tracked in lobby, or role order from `Config.ROLES`.
> - PeerJS will reject reusing the host's peer ID (`'bop-' + roomCode`) immediately after the host disconnects due to server-side TTL. The new host must use a **different** peer ID and broadcast it so others can reconnect to the new address.
> - There is no `Engine.loadState()` or `Engine.setState()` method in the current codebase. A new method to hydrate Engine from a state snapshot must be implemented before migration can work.

### 5.3 Handle AI Players After Migration
**Change:** AI state is part of game state, so new host automatically runs AI turns.

> ⚠️ **AUDIT:** AI decision-making is handled by the `GameAI` module (loaded from `ai.js`), which is separate from `Engine` state. While AI *configuration* may be serializable, the new host must re-initialize `GameAI` for AI-controlled roles after migration. Simply loading game state is not sufficient.

### 5.4 Reconnection Flow
**Change:** Non-host clients attempt reconnect with 3 retries, 3-second delay between attempts.

## Expected Outcome
- Game survives host disconnect ~80% of the time
- Migration takes < 5 seconds
- All game state preserved

## Verification
Manual testing: start game, close host browser, verify migration.

## Audit Notes

**Missing implementation steps:**
1. **No `Engine.setState()` method exists.** The Engine only has `Engine.init(gameLength)` which creates fresh state, and `Engine.getState()` to read it. A new `Engine.setState(snapshot)` (or `Engine.loadState()`) must be added to hydrate the engine from a client's `lastKnownState`.
2. **`pendingVote` state is lost on migration.** If a consensus vote (`requestVote`, line 192) is in progress when the host disconnects, the `pendingVote` object and `voteTimeout` are host-local and unrecoverable. The plan must handle aborting or restarting in-progress votes after migration.
3. **The `connections` object must be rebuilt.** The new host starts with an empty `connections` map; the plan must describe how other clients discover and connect to the new host's peer ID.
4. **Reconnection relies on knowing the new host's peer ID.** Step 5.4 says clients retry with 3-second delays, but doesn't explain how they learn the new host's address. A signaling mechanism (e.g., all clients try connecting to each other by known peer IDs) is needed.

**Side effects:**
- The host's `conn.on('close')` handler (lines 261–284) skips the disconnected player's turn by decrementing `actionsRemaining` directly on state. After migration, the new host must replicate this behavior for future disconnections.

**Cross-plan interaction:**
- Plan 8 (XSS): Any new network messages introduced for migration (e.g., new host announcement) must sanitize data through `escapeHtml()` before rendering.
- Plan 7 (Engine refactor): If engine.js is split into modules later, the new `Engine.setState()` method must be included in the public API contract.

**Recommended implementation order:** Implement after Plan 8 (security fixes should come first).
