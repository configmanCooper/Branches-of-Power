# Branches of Power — Multiplayer & Networking Audit

**Date:** 2025-07-11
**Scope:** WebRTC/PeerJS networking, host-authoritative model, lobby, chat, local multiplayer, GitHub Pages hosting
**Files reviewed:** `network.js`, `ui.js`, `engine.js`, `main.js`, `index.html`

---

## 1. Connection Architecture

### Overview

The game uses PeerJS (v1.5.4, loaded from unpkg CDN) over WebRTC for peer-to-peer connections. The host creates a predictable PeerJS ID (`bop-<ROOMCODE>`) and clients connect to it. All game logic runs in the host's browser via `Engine`, making it a host-authoritative model. Clients send actions to the host, the host executes them and broadcasts the resulting state.

### Findings

#### 1.1 — Predictable Peer IDs Enable Room Sniping
**Priority:** HIGH
**Problem:** The host's PeerJS ID is `bop-` + the 6-character room code (`network.js:239`). Anyone who guesses or brute-forces a room code can connect to the host. The 6-char code from a 31-character alphabet yields ~887 million combinations, but since PeerJS IDs are globally visible on the PeerJS cloud server, an attacker could enumerate active `bop-*` IDs.
**Impact:** Uninvited players can join lobbies. No authentication or password mechanism exists.
**Suggestion:** Add an optional room password. After connecting, require clients to send a `JOIN_AUTH` message with the password before the host adds them to the lobby.
**Implementation:** In `network.js`, `hostGame()`: store a password parameter. In the `peer.on('connection')` handler, don't immediately send `LOBBY_UPDATE`; instead wait for a `JOIN_AUTH` message first. Add a new message type to `handleMessage`.

#### 1.2 — No Host Migration on Host Disconnect
**Priority:** CRITICAL
**Problem:** If the host disconnects, all clients receive a `close` event on their connection and get a toast "Lost connection to host" (`network.js:321`). The game is permanently dead — there is no host migration, no state recovery, no way to continue.
**Impact:** A single browser tab close, crash, or network hiccup by the host ends the game for all players. This is the single biggest multiplayer reliability issue.
**Suggestion:** Implement either (a) host migration — the next player in turn order becomes host and reconstructs state, or (b) periodic state snapshots sent to all clients so a new host can resume. Option (b) is simpler since clients already receive full state via `HOST_STATE_UPDATE`.
**Implementation:**
- In `network.js`, on host connection close: have clients elect a new host (e.g., lowest peer ID).
- The new host calls `Engine.setState(lastReceivedState)` and starts accepting connections.
- Create a new PeerJS peer with the same room code pattern and broadcast a `HOST_MIGRATED` message.

#### 1.3 — Room Code Collision Retry is Unbounded
**Priority:** MEDIUM
**Problem:** When `hostGame()` gets an `unavailable-id` error, it recursively calls itself with a new room code (`network.js:288-293`). There is no retry limit — in theory, this could recurse indefinitely, and each recursive call creates/destroys a PeerJS peer.
**Impact:** Potential stack overflow or runaway PeerJS connections if many collisions occur (unlikely but possible).
**Suggestion:** Add a retry counter (max 5) and surface an error to the user if exhausted.
**Implementation:** Add a `retryCount` parameter to `hostGame()`. Increment on each retry, fail with `onError` if > 5.

#### 1.4 — No Connection Timeout for Joining
**Priority:** HIGH
**Problem:** When a client calls `joinGame()`, the `peer.connect()` call has no timeout. If the host is unreachable (wrong code, host behind restrictive NAT), the client hangs indefinitely with no feedback.
**Impact:** Users enter a room code and see nothing — no loading indicator, no timeout message. They may think the game is broken.
**Suggestion:** Add a 10-second timeout after `peer.connect()`. If `conn.on('open')` doesn't fire, call `callback` with a timeout error.
**Implementation:** In `joinGame()` after `peer.connect()`, start a `setTimeout(10000)`. Clear it in `conn.on('open')`. If it fires, destroy the peer and call `callback({type: 'timeout', message: 'Could not reach host'})`.

#### 1.5 — Race Condition: Host Selects Role Before Lobby Broadcast
**Priority:** LOW
**Problem:** When the host calls `selectRole()` (`network.js:332-341`), it directly mutates `lobby.players` and broadcasts. But if a client sends `ROLE_SELECT` at the same instant for the same role, the host's local mutation happens synchronously while the client's message is queued. The host's role always wins, which is acceptable, but the client gets no feedback that their selection failed — the lobby just doesn't show them in that role.
**Impact:** Minor confusion for clients who select a role at the same time as the host.
**Suggestion:** Send a `ROLE_SELECT_FAILED` message back to the client when their requested role is already taken.
**Implementation:** In `handleMessage` case `ROLE_SELECT`: if the role is taken, send a rejection message back to the specific connection.

---

## 2. State Synchronization

### Overview

The host sends the **entire game state** via `Engine.getState()` after every action. Clients replace their entire local state via `Engine.setState()`. There is no delta/diff system.

### Findings

#### 2.1 — Full State Broadcast on Every Action
**Priority:** HIGH
**Problem:** Every action triggers `broadcast(createMessage('HOST_STATE_UPDATE', Engine.getState()))` (`network.js:108, 375-376`). The game state object is large — it includes 100 senators, 435 house reps, 9 justices, full bill objects, dice history (up to 200 entries), action log, deals, events, etc. A rough estimate puts this at 50–150 KB per sync depending on game progress.
**Impact:** On slow connections or mobile data, this creates noticeable latency. With 4 actions per player per round × 4 players, that's ~16 full state broadcasts per round minimum, potentially 1–2 MB per round.
**Suggestion:** Implement state diffing — only send changed fields. Alternatively, send a hash of the state and let clients request full state only on mismatch.
**Implementation:**
- Create a `diffState(oldState, newState)` function that produces a minimal patch.
- Send `HOST_STATE_DIFF` messages with the patch.
- Periodically (every N actions) send full state as a checkpoint.
- Clients apply diffs to their local state.

#### 2.2 — No Sequence Validation on Client Side
**Priority:** MEDIUM
**Problem:** Messages include a `seq` field (`network.js:50`) but it's never checked by receivers. Messages could arrive out of order (unlikely with WebRTC data channels but possible during reconnection) and the client would apply an older state over a newer one.
**Impact:** Potential desync if messages arrive out of order. The client has no way to detect this.
**Suggestion:** Clients should track the last received `seq` and ignore messages with lower sequence numbers.
**Implementation:** In `handleMessage`, for `HOST_STATE_UPDATE`: store `lastSeq` and skip if `msg.seq <= lastSeq`. Log a warning for dropped messages.

#### 2.3 — Engine.setState() Has Minimal Validation
**Priority:** MEDIUM
**Problem:** `Engine.setState()` (`engine.js:3316-3321`) only checks `if (!s || typeof s !== 'object' || !s.version)`. A malformed state object that has a `version` field but is missing critical properties (e.g., `round`, `president`, `senate`) would be accepted and cause crashes during rendering.
**Impact:** A corrupted state message (from network errors or a malicious host) crashes the game.
**Suggestion:** Add structural validation — check for required top-level properties before accepting state.
**Implementation:** In `Engine.setState()`, validate the presence of `round`, `phase`, `president`, `house`, `senate`, `supremeCourt`, and `bills` before assigning to `state`. Return `false` on failure.

#### 2.4 — Dice Rolls Are Non-Deterministic Across Clients
**Priority:** LOW
**Problem:** `Engine.rollD()` uses `Math.random()` (`engine.js:11`). Since the host runs all game logic, this is actually fine architecturally — dice are only rolled on the host and results are sent via state sync. However, if host migration were implemented (see 1.2), the random seed would differ.
**Impact:** Not currently a problem, but blocks host migration from being fully correct.
**Suggestion:** If host migration is implemented, add a seeded PRNG or include dice results explicitly in state sync.
**Implementation:** Replace `Math.random()` with a seeded PRNG (e.g., `mulberry32`). Include the seed in the game state.

---

## 3. Lobby & Matchmaking

### Overview

The lobby allows players to select one of 4 roles (President, House, Senate, Supreme Court). Players see who has joined and their ready status. The host can configure game length and start when all 4 players are ready.

### Findings

#### 3.1 — No Player Name Input Shown in Join Flow
**Priority:** HIGH
**Problem:** When a player clicks "Join Online Game," `showJoinLobby()` (`ui.js:478-486`) shows a room code input and connect button, but the player name input (from the main menu) is no longer visible. The code at line 108 reads `document.getElementById('player-name-input')` which was in the main menu HTML and has been replaced. The player name defaults to `'Player'`.
**Impact:** All joining players appear as "Player" in the lobby. They cannot set custom names.
**Suggestion:** Add a player name input to the join lobby screen.
**Implementation:** In `showJoinLobby()`, add `<input type="text" id="player-name-input" placeholder="Your Name" class="menu-input" maxlength="20">` before the room code input.

#### 3.2 — Game Requires Exactly 4 Players
**Priority:** MEDIUM
**Problem:** `startGame()` (`network.js:363`) checks `if (playerCount < 4 || !allReady) return false`. The game cannot start with 2 or 3 human players. There is no option to fill empty slots with AI in online mode.
**Impact:** Finding exactly 4 players for an online game is a significant barrier. If one player drops from the lobby, the game can't start.
**Suggestion:** Allow starting with < 4 players and filling remaining roles with AI (using the existing `GameAI` system already built for local mode).
**Implementation:**
- In `startGame()`, remove the `playerCount < 4` check.
- For unfilled roles, create AI players: `GameAI.setAI(role, true, 'random')`.
- The host runs AI turns the same way local mode does.

#### 3.3 — Ready Button is Toggle But Only Sets to True
**Priority:** MEDIUM
**Problem:** The "Ready Up" button (`ui.js:568`) calls `Network.setReady(true)` — it always sets ready to `true`. There's no way to un-ready. The button text says "Ready Up" even when already ready.
**Impact:** Players who accidentally ready up cannot change their mind. No ability to signal "not ready" after a role change.
**Suggestion:** Toggle the ready state and update button text.
**Implementation:** In `handleAction` case `toggleReady`: read current ready state from lobby and invert it: `Network.setReady(!currentReadyState)`. Update the button text dynamically in `renderLobby()`.

#### 3.4 — No Kick/Ban Functionality
**Priority:** LOW
**Problem:** The host has no way to remove a player from the lobby. If an unwanted player joins (see 1.1), the host's only option is to close and recreate the room.
**Impact:** Minor griefing vector. Unwanted players can squat on roles.
**Suggestion:** Add a "Kick" button next to each player in the lobby (host only). Send a `KICKED` message to the connection and close it.
**Implementation:** In `renderLobby()`, add a kick button for non-host players when `Network.isHost()`. Add a `KICK_PLAYER` message type in `network.js` that closes the connection and removes the player from the lobby.

#### 3.5 — No Lobby Chat
**Priority:** LOW
**Problem:** Chat is only rendered in `renderGame()` (`ui.js:777`). In the lobby, there is no chat interface, even though `Network.sendChat()` is functional.
**Impact:** Players can't coordinate before the game starts. No way to discuss role assignments or game settings.
**Suggestion:** Add a chat panel to the lobby screen.
**Implementation:** In `renderLobby()`, add the same chat HTML from `renderGame()`. The `Network.sendChat()` and message handling already work.

---

## 4. Error Handling & Recovery

### Overview

Error handling is minimal. Network errors show toast messages. Disconnected players are marked as `disconnected: true` in the lobby. Reconnection is partially implemented but has significant gaps.

### Findings

#### 4.1 — Reconnection Exists But Is Not Triggered Automatically
**Priority:** CRITICAL
**Problem:** `handleMessage` has a `RECONNECT` case (`network.js:170-184`) that re-associates a peer with a disconnected role. However, there is no code that **sends** a `RECONNECT` message. The client's connection close handler (`network.js:320-322`) just fires `onError` and does nothing else. There is no reconnection logic.
**Impact:** The reconnection system is dead code. If a client disconnects mid-game, they cannot rejoin. The role is permanently locked as "disconnected."
**Suggestion:** Implement automatic reconnection: when a client detects connection loss, retry connecting to the host and send a `RECONNECT` message with their role.
**Implementation:**
- In `joinGame()`, store the room code and role as module-level variables.
- On connection close, start a reconnection loop: every 3 seconds, attempt `peer.connect('bop-' + roomCode)`.
- On successful reconnection, send `createMessage('RECONNECT', { role: myRole })`.
- After 5 failed attempts, give up and show an error.
- Add a "Reconnecting..." UI state.

#### 4.2 — No Timeout for Disconnected Players During Game
**Priority:** HIGH
**Problem:** When a player disconnects mid-game, the host marks them as `disconnected` and skips their turn by decrementing `actionsRemaining` (`network.js:273-283`). But this only works if it's currently their turn. If they disconnect during another player's turn, their future turn will hang — the game advances to their turn and then… the skip logic isn't triggered.
**Impact:** If a non-current player disconnects, the game freezes when it reaches their turn. The turn advancement logic in `engine.js` expects the current player to act.
**Suggestion:** In `advanceTurn()` or when checking the current role, skip disconnected players automatically.
**Implementation:** In `network.js`, after advancing to a new turn (in `HOST_STATE_UPDATE` processing or a new `TURN_ADVANCE` handler), check if `lobby.players[currentRole].disconnected === true`. If so, skip their actions immediately using `Engine.skipRemainingActions(currentRole)`.

#### 4.3 — No Heartbeat / Keepalive
**Priority:** MEDIUM
**Problem:** There is no heartbeat mechanism. If a WebRTC data channel silently fails (e.g., the peer's browser freezes but doesn't close the connection), the host has no way to detect the dead connection.
**Impact:** Zombie connections that appear connected but can't send/receive data. The game waits forever for a frozen player's turn.
**Suggestion:** Implement a heartbeat: the host sends a `PING` every 10 seconds, clients respond with `PONG`. If 3 consecutive pings go unanswered, mark the player as disconnected.
**Implementation:** Add `PING`/`PONG` message types. Start a `setInterval(10000)` on the host after game start. Track last pong time per connection. Trigger disconnect handling if > 30 seconds without pong.

#### 4.4 — Error Messages Are Generic
**Priority:** LOW
**Problem:** `main.js:44-46` shows `'Connection error: ' + (err.message || err.type || 'Unknown')`. PeerJS error types like `'peer-unavailable'`, `'network'`, `'server-error'` are not translated into user-friendly messages.
**Impact:** Users see cryptic error messages like "Connection error: peer-unavailable" instead of "Room not found."
**Suggestion:** Map PeerJS error types to friendly messages.
**Implementation:** In `main.js` `onError` handler or in `network.js`, create a map: `{'peer-unavailable': 'Room not found. Check the code and try again.', 'network': 'Network connection lost.', ...}`.

---

## 5. Security & Cheating

### Overview

The host-authoritative model means the host validates all actions via `Engine.executeAction()`. Clients cannot directly modify game state — they send action requests that the host processes. However, there are significant gaps.

### Findings

#### 5.1 — Host Player Has Full Console Access to Engine
**Priority:** HIGH
**Problem:** The host runs `Engine` in their browser. They can open DevTools and call `Engine.getState()` to see all game information, and `Engine.executeAction()` to take actions as any role. They can also directly modify `state` properties.
**Impact:** The host can cheat freely — see opponent VP, modify popularity, manipulate dice, etc. This is inherent to the architecture but worth documenting.
**Suggestion:** This is fundamentally unsolvable without a dedicated server. Mitigations: (a) rotate the host each round, (b) add a checksum of critical state values that clients can verify, (c) log all state changes and allow post-game review.
**Implementation:** For checksum approach: after each action, compute a hash of `[round, vp values, popularity, actionsRemaining]` and include it in `HOST_STATE_UPDATE`. Clients independently verify the hash against known game rules. Discrepancies trigger a warning.

#### 5.2 — Role Spoofing is Prevented (Good)
**Priority:** N/A (positive finding)
**Problem:** None — this is well-implemented. When the host receives a `PLAYER_ACTION`, it looks up the sender's actual role from `lobby.players` by matching `fromPeerId` (`network.js:93-100`). If the claimed role doesn't match the actual peer, the action is rejected.
**Impact:** Clients cannot impersonate other roles for actions.
**Suggestion:** No change needed. This is good security practice.

#### 5.3 — Chat Message Sanitization is Incomplete
**Priority:** MEDIUM
**Problem:** Chat messages are truncated to 500 characters (`network.js:119, 385`) and rendered with `escapeHtml()` (`ui.js:781`), which prevents XSS. However, the `from` field in chat messages is not validated by the host — a client could send a `CHAT_MESSAGE` with `from: 'president'` even if they're the senate player.
**Impact:** Players can impersonate other roles in chat, enabling social engineering.
**Suggestion:** On the host, override the `from` field in `CHAT_MESSAGE` with the sender's actual role (looked up from `lobby.players` by `fromPeerId`).
**Implementation:** In `handleMessage` case `CHAT_MESSAGE` (when `isHost`): look up sender's role from `lobby.players` using `fromPeerId`, and replace `msg.payload.from` with the verified role before broadcasting.

#### 5.4 — No Rate Limiting on Messages
**Priority:** MEDIUM
**Problem:** A malicious client could flood the host with thousands of `PLAYER_ACTION`, `CHAT_MESSAGE`, or `ROLE_SELECT` messages per second. The host processes each synchronously.
**Impact:** Could cause the host's browser to become unresponsive (denial of service to all players).
**Suggestion:** Add per-connection rate limiting: max 10 messages/second. Drop excess messages and warn.
**Implementation:** In `conn.on('data')`, track message count per connection with a sliding window. If > 10 messages in the last second, drop the message and optionally disconnect the peer.

#### 5.5 — Action Parameters Are Not Fully Validated
**Priority:** MEDIUM
**Problem:** When the host receives a `PLAYER_ACTION`, it passes `msg.payload.params` directly to `Engine.executeAction()` (`network.js:101`). While `executeAction` validates the role and turn, the `params` object is used without deep validation. For example, `presidentStateDinner(params.targetRole)` — a client could send `targetRole: '__proto__'` or other unexpected values.
**Impact:** Potential for prototype pollution or unexpected behavior from crafted params. Could crash the engine.
**Suggestion:** Whitelist valid param values in `executeAction` before passing to action functions.
**Implementation:** In `executeAction()`, validate `params` values against expected types and ranges. For `targetRole`: check it's in `['president','house','senate','supremeCourt']`. For numeric params: ensure they're numbers within expected ranges.

---

## 6. Performance

### Overview

The game is turn-based so real-time performance is less critical than in action games. However, the full-state broadcast pattern creates unnecessary overhead.

### Findings

#### 6.1 — Full State Serialization Overhead
**Priority:** HIGH
**Problem:** `Engine.getState()` returns the raw state object reference (`engine.js:3315`). When broadcast, it's serialized via `JSON.stringify()`. The state includes large arrays (100 senators, 435 house reps) that never change between most actions. Additionally, `JSON.parse(JSON.stringify(Engine.getState()))` is used for deep cloning (`network.js:367, 377`) which doubles the serialization cost.
**Impact:** Each action triggers 2-3 full JSON serializations of a large object. On lower-end devices, this could cause frame drops or input lag.
**Suggestion:**
1. Cache the serialized state string and reuse it for broadcast + local update.
2. Exclude static data (senate/house composition arrays) from sync unless they actually changed.
**Implementation:** In `sendAction()` (host path): serialize once with `var stateStr = JSON.stringify(Engine.getState())`, use `stateStr` for broadcast and `JSON.parse(stateStr)` for local callback.

#### 6.2 — Chat Re-Renders Entire Game Board
**Priority:** MEDIUM
**Problem:** `addChatMessage()` (`ui.js:1465-1468`) pushes the message to the array and then calls `renderGame(currentState)`, which rebuilds the **entire DOM** — all player panels, bills, composition charts, action buttons, and the chat. This is extremely wasteful for a single chat message.
**Impact:** Chat messages cause visible flicker and layout reflow. On complex game states, this could take 50-100ms per chat message.
**Suggestion:** Update only the chat panel DOM instead of re-rendering everything.
**Implementation:** In `addChatMessage()`, find `#chat-messages` element and append a new `<span>` element instead of calling `renderGame()`. Only call `renderGame` if the chat panel doesn't exist yet.

#### 6.3 — No Cleanup of Event Listeners
**Priority:** MEDIUM
**Problem:** Every call to `renderGame()` creates a new chat keypress listener (`ui.js:802-808`). Since `renderGame()` is called on every state update and every chat message, listeners accumulate. The old chat input element is removed from DOM (so old listeners are garbage-collected with it), but the pattern is fragile.
**Impact:** Currently not a leak because DOM elements are replaced, but if the architecture changes to incremental updates, this becomes a leak.
**Suggestion:** Use event delegation for the chat input (like other actions use `data-action` delegation), or check for existing listener.
**Implementation:** Add `data-action="sendChat"` to the chat input and handle Enter key in the `handleAction` switch, using event delegation already set up in `init()`.

#### 6.4 — Dice History Grows Unbounded in Practice
**Priority:** LOW
**Problem:** Dice history is capped at 200 entries (`engine.js:14`), which is fine. But it's included in every state sync. With 200 entries × ~50 bytes each ≈ 10KB of dice history sent every sync.
**Impact:** Minor: adds ~10KB to each state message.
**Suggestion:** Don't include `diceHistory` in state syncs to clients. It's only used locally.
**Implementation:** Create a `getStateForSync()` method that returns state without `diceHistory` and `log` arrays. Use this for broadcast while keeping `getState()` for local use.

---

## 7. Chat System

### Overview

Chat is hub-and-spoke through the host. Clients send messages to the host, which broadcasts them to all players. Messages are attributed by role and rendered with role colors.

### Findings

#### 7.1 — Chat History Limited to 20 Messages
**Priority:** LOW
**Problem:** `renderGame()` (`ui.js:779`) only renders the last 20 messages: `Math.max(0, chatMessages.length - 20)`. The full array is kept in memory but older messages are not visible.
**Impact:** In long games, players lose important conversation context. No scroll-back capability.
**Suggestion:** Render all messages (or a larger window like 100) and set `overflow-y: auto` on the chat container with auto-scroll to bottom.
**Implementation:** Change `chatMessages.length - 20` to `chatMessages.length - 100` or remove the limit. Ensure the chat container CSS has `overflow-y: auto; max-height: 200px`. Add `chatMessages.scrollTop = chatMessages.scrollHeight` after render.

#### 7.2 — Chat Role Impersonation (see 5.3)
**Priority:** MEDIUM
**Problem:** Covered in finding 5.3. The `from` field is client-supplied and not verified by the host.
**Impact:** Duplicate of 5.3.

#### 7.3 — No Chat Moderation or Mute
**Priority:** LOW
**Problem:** There is no way to mute a player or filter chat content. No profanity filter, no spam detection, no ability for the host to moderate.
**Impact:** In public games, chat could be used for harassment. The 500-character limit helps but doesn't prevent abusive content.
**Suggestion:** Add a client-side mute toggle per player. Optionally add a basic spam filter (block rapid repeated messages).
**Implementation:** In `addChatMessage()`, check if `msg.from` is in a `mutedPlayers` set. If so, skip. Add a mute button to player panels. For spam: track last 3 message times per sender, block if < 1 second apart.

#### 7.4 — Chat Persists Through Game but Not Through Reconnection
**Priority:** LOW
**Problem:** If a client reconnects (when 4.1 is implemented), the `chatMessages` array is local to the client and is lost on page reload. The host doesn't resend chat history on reconnection.
**Impact:** Reconnected players lose all chat context.
**Suggestion:** Include recent chat messages in the reconnection state sync.
**Implementation:** Store chat history on the host (already done via broadcast relay). On `RECONNECT`, send the last 50 messages to the reconnecting client.

---

## 8. Local Multiplayer (AI)

### Overview

The `roomCode='LOCAL'` system allows hot-seat play with any combination of human and AI players. AI uses a 3-second delay before acting.

### Findings

#### 8.1 — AI Turn Delay Blocks Interaction
**Priority:** MEDIUM
**Problem:** AI turns use `setTimeout(3000)` (`ui.js:821`). During this 3 seconds, the human player sees the game board but can't do anything meaningful (it's not their turn). The delay is fixed — no way to speed up or skip AI thinking.
**Impact:** In a game with 3 AI players, humans wait 9+ seconds per round just watching AI "think." This gets tedious in long games.
**Suggestion:** Add a "Speed" setting (Fast: 1s, Normal: 3s, Instant: 0s). Also add visual feedback like "🤖 AI is thinking..." during the delay.
**Implementation:** Add a `Config.AI_DELAY` setting. In `renderGame()` AI section, use `Config.AI_DELAY` instead of hardcoded `3000`. Add a visible "thinking" indicator in the current turn display.

#### 8.2 — AI Error Handling Uses alert()
**Priority:** MEDIUM
**Problem:** AI errors trigger `alert()` (`ui.js:819`), which blocks the entire page and requires user interaction to dismiss.
**Impact:** An AI bug freezes the game behind a modal alert. The error contains a stack trace which is not useful to players.
**Suggestion:** Replace `alert()` with `showToast()` and skip the AI's turn gracefully.
**Implementation:** Replace the `alert(...)` in the AI catch block with `showToast('AI error — skipping turn', 'error')`. Call `Engine.skipRemainingActions(aiTurnRole)` to advance the game.

#### 8.3 — Local Mode Doesn't Validate Human Player Count
**Priority:** LOW
**Problem:** In `showLocalSetup()`, all 4 players can be set to AI. The game starts but no human ever gets a turn — the AI plays itself in an infinite loop of 3-second delays.
**Impact:** Amusing but not useful. The game runs but is non-interactive.
**Suggestion:** Require at least one human player, or add a "spectator" mode label.
**Implementation:** In `startLocalGame` action handler, count human players. If zero, show a toast: "At least one player must be human" or label the mode as "AI Simulation."

#### 8.4 — Hot-Seat Has No Turn Transition Screen
**Priority:** MEDIUM
**Problem:** In hot-seat mode (multiple humans, one screen), when the turn passes from one human to another, there's no privacy screen. The next player can see the previous player's game state before they "sit down."
**Impact:** In a competitive game, this leaks strategic information (VP counts, action choices, etc.).
**Suggestion:** Show a "Pass to [Player Name]" overlay between human turns that requires a click to reveal the game board.
**Implementation:** In `renderGame()`, after detecting a turn change to a different human player, show a full-screen overlay: "It's [Role]'s turn! Click to begin." Only render the game board after click.

---

## 9. GitHub Pages Hosting

### Overview

The game is designed for GitHub Pages — static HTML/CSS/JS with PeerJS handling all networking via the PeerJS cloud server (0.peerjs.com).

### Findings

#### 9.1 — PeerJS CDN Dependency on unpkg
**Priority:** HIGH
**Problem:** PeerJS is loaded from `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js` (`index.html:11`). This is a single point of failure — if unpkg goes down or rate-limits the request, the game won't load. unpkg has had outages historically.
**Impact:** Game completely fails to load if unpkg is unavailable.
**Suggestion:** Self-host the PeerJS library. Download `peerjs.min.js` and serve it from the game's own `js/` directory. Add the CDN as a fallback.
**Implementation:**
1. Download `peerjs.min.js` to `game/js/peerjs.min.js`.
2. Change the script tag to: `<script src="js/peerjs.min.js"></script>`.
3. Optionally add a fallback: `<script>window.Peer || document.write('<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"><\/script>')</script>`.

#### 9.2 — PeerJS Cloud Server Reliability
**Priority:** HIGH
**Problem:** The game relies entirely on `0.peerjs.com` for signaling (the PeerJS cloud server). This free public server has no SLA, is shared with all PeerJS users globally, and can be slow or unavailable. The `PEERJS_CONFIG` (`network.js:22-34`) hardcodes this server with no fallback.
**Impact:** If the PeerJS cloud server is overloaded or down, no games can be created or joined, even though the game files load fine.
**Suggestion:** (a) Add a fallback signaling server, or (b) deploy a lightweight PeerJS server on a free tier (e.g., Glitch, Render), or (c) document the dependency and add error messaging for when it's unavailable.
**Implementation:** Easiest: add a second PeerJS server config as fallback. In `hostGame()` and `joinGame()`, if the first server fails, retry with the fallback config.

#### 9.3 — Only STUN Servers, No TURN Servers
**Priority:** HIGH
**Problem:** The ICE configuration (`network.js:29-31`) only includes Google STUN servers. There are no TURN servers. STUN only works when both peers can establish a direct connection (not behind symmetric NAT). Approximately 10-15% of WebRTC connections fail without TURN.
**Impact:** Some players behind corporate firewalls, carrier-grade NAT, or strict routers will be unable to connect at all. They'll see no error — the connection just silently fails.
**Suggestion:** Add free TURN servers or integrate a TURN service. Options include Metered.ca (free tier), Xirsys, or OpenRelay.
**Implementation:** Add TURN server entries to `iceServers` in `PEERJS_CONFIG`:
```javascript
{ urls: 'turn:relay.metered.ca:80', username: '...', credential: '...' },
{ urls: 'turn:relay.metered.ca:443', username: '...', credential: '...' }
```
Note: TURN credentials typically require a backend for security, which conflicts with the GitHub Pages model. A fixed API key with usage limits is the pragmatic compromise.

#### 9.4 — No HTTPS Mixed Content Issues (Good)
**Priority:** N/A (positive finding)
**Problem:** None. GitHub Pages serves over HTTPS. PeerJS CDN uses HTTPS. PeerJS cloud server uses `secure: true` (WSS). All connections are TLS-secured.
**Impact:** No mixed content issues.

---

## 10. Future Scalability

### Overview

Assessment of how the current architecture would support potential future features.

### Findings

#### 10.1 — Spectator Mode Feasibility
**Priority:** LOW
**Problem:** The current architecture doesn't support spectators. All connections are treated as potential players, and the lobby requires role selection.
**Impact:** No way to watch a game without occupying a player slot.
**Suggestion:** Add a `SPECTATOR` role type. Spectators receive `HOST_STATE_UPDATE` and `CHAT_MESSAGE` but cannot send `PLAYER_ACTION` or `ROLE_SELECT`.
**Implementation:**
- In `handleMessage` `ROLE_SELECT` case, allow a special `'spectator'` role.
- Spectators are stored in `lobby.spectators[]` (array, not keyed by role).
- Spectators receive broadcasts but action messages from them are ignored.
- UI renders a read-only game view for spectators.

#### 10.2 — Save/Load for Multiplayer
**Priority:** LOW
**Problem:** No save/load system exists for multiplayer games. The full game state is already serializable (it's plain JSON), so the technical barrier is low.
**Impact:** Games that take 30-60 minutes can't be paused and resumed.
**Suggestion:** Add a "Save Game" button for the host that exports the game state + lobby as a JSON file. "Load Game" re-initializes from the JSON.
**Implementation:**
- Host clicks "Save": `JSON.stringify({state: Engine.getState(), lobby: Network.getLobby()})` → download as `.json` file.
- "Load Game" in main menu: upload JSON, host calls `Engine.setState(saved.state)`, restores lobby, broadcasts to reconnecting players.
- Players would need to reconnect with the same roles.

#### 10.3 — Async/Turn-Based Play
**Priority:** LOW
**Problem:** The game is synchronous — all players must be connected simultaneously. There's no support for play-by-email or asynchronous turn-taking.
**Impact:** Limits accessibility for players in different time zones.
**Suggestion:** Would require a server backend (e.g., Firebase Realtime Database or Supabase) to store game state persistently. This fundamentally changes the architecture away from pure WebRTC.
**Implementation:** Not feasible with the current GitHub Pages + PeerJS architecture without adding a backend service. Would require: persistent state storage, player authentication, turn notifications (email/push), and state locking.

#### 10.4 — More Than 4 Players
**Priority:** LOW
**Problem:** The game is architecturally locked to exactly 4 roles (`Config.ROLES`). Engine state, turn order, action system, and UI are all built around these 4 roles.
**Impact:** Cannot add more players without fundamental redesign.
**Suggestion:** This is a game design constraint, not a technical bug. The 4-role structure (President, House, Senate, Supreme Court) mirrors real U.S. government structure. Adding players would mean either subdividing roles or adding new branches.
**Implementation:** If desired, the most feasible path would be adding "advisor" roles that share a branch with an existing player, with limited action sets. This would require new role definitions in `Config`, new actions in `Engine`, and new UI panels.

---

## Summary — Priority Matrix

### CRITICAL (Must Fix)
| # | Finding | Impact |
|---|---------|--------|
| 1.2 | No host migration | Host disconnect kills game for all players |
| 4.1 | Reconnection is dead code | Disconnected players can never rejoin |

### HIGH (Should Fix)
| # | Finding | Impact |
|---|---------|--------|
| 1.1 | Predictable peer IDs | Uninvited players can join |
| 1.4 | No join timeout | Clients hang forever on bad codes |
| 2.1 | Full state broadcast | 50-150KB per action on the wire |
| 3.1 | No name input in join flow | All joiners named "Player" |
| 3.2 | Requires exactly 4 humans | Hard to find 4 players online |
| 4.2 | No timeout for disconnected players | Game freezes on disconnected player's turn |
| 5.1 | Host can cheat via console | Inherent but unmitigated |
| 6.1 | Full state serialization cost | Performance hit on low-end devices |
| 9.1 | PeerJS CDN single point of failure | Game fails if unpkg goes down |
| 9.2 | PeerJS cloud server reliability | No games if signaling server is down |
| 9.3 | No TURN servers | 10-15% of players can't connect |

### MEDIUM
| # | Finding | Impact |
|---|---------|--------|
| 1.3 | Unbounded room code retry | Potential stack overflow |
| 2.2 | No sequence validation | Possible desync |
| 2.3 | Minimal setState validation | Crashes on malformed state |
| 3.3 | Ready toggle only sets true | Can't un-ready |
| 4.3 | No heartbeat | Zombie connections undetected |
| 5.3 | Chat role impersonation | Social engineering in chat |
| 5.4 | No rate limiting | DoS by flooding messages |
| 5.5 | Unvalidated action params | Potential crashes from crafted params |
| 6.2 | Chat re-renders entire UI | Flicker and performance waste |
| 6.3 | Event listener pattern is fragile | Potential leak if architecture changes |
| 8.1 | Fixed 3-second AI delay | Tedious with multiple AI players |
| 8.2 | AI errors use alert() | Page-blocking error dialogs |
| 8.4 | No hot-seat privacy screen | Information leakage between turns |

### LOW
| # | Finding | Impact |
|---|---------|--------|
| 1.5 | Role selection race condition | Minor confusion |
| 2.4 | Non-deterministic dice | Blocks future host migration |
| 3.4 | No kick/ban | Minor griefing vector |
| 3.5 | No lobby chat | Can't coordinate pre-game |
| 4.4 | Generic error messages | Confusing for users |
| 6.4 | Dice history in sync | Minor bandwidth waste |
| 7.1 | Chat limited to 20 messages | Loses conversation context |
| 7.3 | No chat moderation | Potential harassment |
| 7.4 | Chat lost on reconnection | Missing context after rejoin |
| 8.3 | All-AI game allowed | Non-interactive game |

---

## Recommended Implementation Order

1. **Self-host PeerJS library** (9.1) — 5 minutes, eliminates CDN risk
2. **Fix player name input in join flow** (3.1) — 5 minutes, fixes broken UX
3. **Add join timeout** (1.4) — 15 minutes, prevents user confusion
4. **Implement reconnection** (4.1) — 2 hours, enables recovery from drops
5. **Add TURN servers** (9.3) — 30 minutes, fixes connectivity for ~15% of users
6. **Fix disconnected player turn skip** (4.2) — 30 minutes, prevents game freezes
7. **Validate chat `from` field** (5.3) — 10 minutes, prevents impersonation
8. **AI-fill for online games** (3.2) — 1 hour, makes online games viable with < 4 players
9. **Optimize state sync** (2.1, 6.1) — 3 hours, reduces bandwidth significantly
10. **Host migration** (1.2) — 4-6 hours, the most impactful but hardest fix
