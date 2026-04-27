# Branches of Power — Mobile Visibility Audit (Comprehensive)

## Date: 2025 (Updated)
## Device target: ~375px wide (iPhone SE / similar)
## Files audited: css/style.css, js/ui.js

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| CRITICAL | 5 | Elements clipped or untappable on mobile |
| HIGH | 7 | Text below 12px, poor touch targets, layout overflow |
| MEDIUM | 5 | Minor usability issues |
| LOW | 2 | Cosmetic polish |

---

## CRITICAL Issues (All Fixed)

### C1. Bill card overflow:hidden clips content
- Location: CSS line 233 .bill-card { overflow: hidden; }
- Problem: No mobile override exists. Bill-status and bill-warning can be clipped.
- Fix: Added overflow: visible !important in 600px media query.

### C2. Bill tabs clipped and too small to tap
- Location: JS ui.js line 969 inline styles: max-width:150px; overflow:hidden; white-space:nowrap; padding:4px 10px
- Problem: Long bill names clipped at 150px. Touch target ~28px, below 44px minimum.
- Fix: CSS !important overrides: max-width:none, white-space:normal, min-height:44px.

### C3. Deal Accept/Reject buttons untappable
- Location: JS ui.js lines 1158-1159 inline padding:3px 10px
- Problem: Button height ~22px, drastically below 44px touch target.
- Fix: CSS !important on .deals-panel button for min-height/padding.

### C4. Deal Fulfill/Break buttons untappable
- Location: JS ui.js lines 1176-1177 same inline padding issue.
- Fix: Same CSS fix as C3.

### C5. Passed Laws button too small
- Location: JS ui.js line 733 inline padding:6px, height ~30px.
- Fix: CSS !important override for [data-action=showPassedLaws] min-height.

---

## HIGH Issues (All Fixed)

### H1. Stat labels at 0.6em (~9.6px)
- Fix: Increased to 0.7em in 600px media query.

### H2. Log entries at 0.72em (~11.5px)
- Fix: Increased to 0.78em in 600px media query.

### H3. Composition numbers at 0.7em (~11.2px) + text overflow
- Fix: Increased to 0.78em, added overflow-wrap: break-word.

### H4. AI setup rows dont wrap on mobile
- Location: JS ui.js line 507 inline display:flex without flex-wrap
- Fix: CSS !important override on .ai-role-setup for flex-wrap.

### H5. Event failure warnings text overflow
- Fix: CSS override for .event-banner word-wrap and line-height.

### H6. Role switch buttons min-height 36px (should be 44px)
- Fix: Changed to 44px in 600px media query.

### H7. Stability gauge inline 80px bar inflexible
- Fix: CSS override for stability gauge bar width to be responsive.

---

## MEDIUM Issues (Noted for future)

- M1: AI badge opacity 0.7 on dark bg low contrast
- M2: Action cost font 0.7em = ~11.2px borderline
- M3: Propose Deal button small touch target
- M4: Law card badges cramped when multiple
- M5: Unity Summit small tag reduces text below 12px

## LOW Issues (Noted for future)

- L1: Event severity badge tight on mobile
- L2: Comp label 0.7em borderline

---

## Technical Notes

- Inline styles vs CSS: Many elements in ui.js use inline styles that override CSS.
  All fixes use !important inside @media queries to ensure overrides work.
- Desktop unchanged: All fixes are scoped to @media (max-width: 600px) or @media (max-width: 380px).
- Bill name white-space:nowrap is NOT applied to bill name h3, only to bill tab buttons.
  Bill names inside cards wrap correctly.
- renderBillCard() inline styles: Only border-color and background are set inline.
  These dont conflict with mobile layout CSS.