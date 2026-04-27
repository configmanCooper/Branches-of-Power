# Plan 8: Fix innerHTML XSS Vectors

## Problem
UI uses `innerHTML` with string concatenation. `escapeHtml()` exists but isn't applied consistently to network-sourced data (player names, deal text, room codes).

## Approach (NOT IMPLEMENTING YET)

### 8.1 Audit All innerHTML Assignments
Identify every `innerHTML =` and verify dynamic data passes through `escapeHtml()`.

### 8.2 Escape All Network-Sourced Data
Apply `escapeHtml()` to player names, deal descriptions, room codes in toasts.

> ⚠️ **AUDIT: Toasts are safe.** `showToast()` (ui.js line 441–451) uses `el.textContent`, not `innerHTML`, so toast content is already immune to XSS. Remove "room codes in toasts" from scope. The actual unescaped XSS vectors are:
> - **ui.js line 543:** `lobby.roomCode` inserted into lobby display via innerHTML without `escapeHtml()`
> - **ui.js line 633:** `Network.getRoomCode()` inserted into game header via innerHTML without `escapeHtml()`
> - **ui.js line 970:** `b.name` (bill name from game state) inserted into bill tabs without `escapeHtml()`
> - **ui.js line 516:** AI personality name inserted into option elements without `escapeHtml()`
>
> Note: Most other dynamic data IS properly escaped. Player names in lobby (line 558), chat messages (line 781), action labels (line 1113), deal messages (line 1156), and bill names in cards (line 996) all use `escapeHtml()`.

### 8.3 Content Security Policy
Add CSP meta tag to prevent inline script execution.

> ⚠️ **AUDIT:** `index.html` loads PeerJS from an external CDN (`https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js` — line 11). A strict CSP must allowlist `unpkg.com` in `script-src`. Also verify that PeerJS doesn't use `eval()` or inline styles that would conflict with the policy. The CSP directive should be at minimum: `script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline'` (inline styles are used extensively throughout the UI rendering).

### 8.4 Use textContent Where Possible
For elements that don't need HTML (VP numbers, counters), use `textContent`.

## NOT IMPLEMENTING - Plan only for future reference

## Audit Notes

**Accuracy issues:**
1. **Section 8.2 incorrectly identifies toasts as an XSS vector.** `showToast()` at ui.js line 447 uses `el.textContent`, which is safe. Corrected above.
2. **The plan understates escapeHtml() coverage.** The codebase already applies `escapeHtml()` in ~20 locations (player names, chat text, bill names in cards, action labels, deal messages, log entries, etc.). The actual gaps are limited to 4 specific lines (543, 633, 970, 516) identified above.

**Completeness — full innerHTML audit results (12 assignments found):**
| Line | Target | Dynamic Data | Escaped? |
|------|--------|-------------|----------|
| 273 | modal-body | bodyHtml (internal) | N/A (trusted) |
| 274 | modal-footer | footerHtml (internal) | N/A (trusted) |
| 456 | game-content | main menu (static) | N/A |
| 471 | game-content | host lobby (static) | N/A |
| 480 | game-content | join lobby (static) | N/A |
| 525 | game-content | local setup | Mostly safe |
| 582 | info element | lobby render | **lobby.roomCode unescaped (line 543)** |
| 793 | game-content | full game render | **getRoomCode() unescaped (line 633), b.name unescaped (line 970)** |
| 1296 | askEl | deal options | Safe (uses Config constants) |
| 1392 | modalBody | modal body | Depends on caller |
| 1398 | modalFooter | modal footer | Depends on caller |
| 1453 | game-content | game over | Uses escapeHtml |

**Side effects of fixes:**
- Room codes are generated from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (network.js line 37), so they're inherently safe characters. However, a malicious PeerJS client could theoretically send a crafted `LOBBY_UPDATE` with a poisoned `roomCode` field, so escaping is still warranted.

**Cross-plan interactions:**
- Plan 5 (Host Migration): New migration messages and UI (e.g., "Migrating host..." status) must follow escapeHtml() patterns.
- Plan 6 (Onboarding): New tutorial overlays and tooltip content injected via innerHTML must use escapeHtml() for any dynamic text.

**Recommended implementation order:** This plan should be implemented **first** among the four plans, as it establishes secure patterns that Plans 5 and 6 should follow.
