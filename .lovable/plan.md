# Home currency and Wealth workflow upgrade

## Goal
Add device-aware home currency support across Wealth, preserve original entered currencies, strengthen readiness guidance, and make edit/delete/settle actions safe and reversible.

## Implementation

### 1. Currency foundation
- Create the shared currency module with the supplied currencies, bundled INR-based indicative rates, locale-based default currency, cross-rate conversion, and locale-aware money formatting.
- Extend holdings and transactions with original amount, original currency, and captured exchange-rate fields.
- Add `currency` to the persisted app state, default it from the device locale, and expose `getCurrency()` plus `setCurrency()`.
- When home currency changes, recalculate every holding and transaction from its preserved original amount when available; otherwise convert from the previous home currency.
- Keep home currency outside sample/empty data bundles so switching demo modes cannot unexpectedly change the user preference.

### 2. Shared design and formatting rules
- Add the supplied chip, tap-target, icon-button, Wealth-row, and readiness-action styles at the shared stylesheet level.
- Update the design-system source of truth with minimum type size, touch-target, confirmation, reversible-state, currency, and device-locale date rules.
- Replace the requested hard-coded money and date formatting with shared `formatMoney`, `fmtDate`, and original-currency subline helpers.
- Reconstruct the pasted JSX fragments whose tags were stripped using the app’s existing `button`, `span`, `div`, `select`, `input`, `Card`, and `MSheet` patterns.

### 3. Wealth readiness and attention logic
- Remove unused Wealth totals and use amount-weighted readiness when amounts exist, with count-weighted fallback when they do not.
- Keep loans outside the score while adding missing loan documents and closure instructions to Needs attention.
- Treat passed policy renewal dates as critical and retain upcoming-renewal severity behavior.
- Use the shared status-chip class, show original-currency details, and expose Document, Nominee, and Access actions for the applicable rows, including loans.
- Move SOS handoff from the add sheet into the readiness area beside Family summary.
- Make Needs-attention contact issues open the transaction editor and access issues focus the instructions field.
- Show the mobile category rail only after at least one holding or transaction exists; the empty action opens the appropriate mobile/desktop add flow.

### 4. Safe, editable money records
- Add a shared confirmation sheet before Wealth and use it for holding and transaction removal.
- Make transaction rows editable, including their currency, rate, amount, dates, contact, follow-up details, and optional new evidence.
- Display overdue follow-ups accurately, preserve original-currency sublines, and make Evidence and Contact chips actionable.
- Add reversible settlement: open entries can be settled and settled entries can be reopened.
- Add original-currency entry and editable indicative conversion controls to both transaction and holding forms.
- Always provide family access/closure instructions, including for liabilities, and focus that field when launched from an Access gap.

### 5. Settings
- Add Home currency under Preferences with the supported currency list.
- Changing it immediately recalculates displayed totals and readiness values and confirms the selected currency.

## Technical safeguards
- Preserve existing document links and evidence when records are edited or removed.
- Avoid non-null assertions in new code; narrow optional transaction/holding values before use.
- Preserve existing design tokens and shared controls rather than introducing one-off styling.
- Use the current device-local persistence model; no backend or account migration is added.

## Validation
- Run the TypeScript check and inspect the dev-server output for regressions.
- Test desktop and 393px mobile layouts with no horizontal overflow.
- Verify default locale currency, Settings currency switching, repeated currency switching without compounding conversion drift, and persistence after reload.
- Verify add/edit flows for same-currency and foreign-currency holdings and transactions, including custom rates and original-amount sublines.
- Verify readiness with valued records, amount-free records, loans, lapsed/upcoming policies, and open/settled transactions.
- Verify Needs-attention actions, access-field focus, evidence attachment, transaction edit, settle/reopen, confirmed removal/cancel, empty-state add flow, Family summary, and SOS handoff.
