# Changelog

All notable changes to **Tank Farm & Terminal Dip Recording Control Center** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

---

## [0.3.1] - 2026-08-17

### Added
- **Same-tank previous history in the review card** — when a Shift In-Charge / Administrator reviews a Dip Record, the dialog now shows the tank's last 10 recordings (most recent first, excluding the record under review) with date/time, gross/auto/radar/water/sludge dips, temperature, density, status and operator, for faster, data-backed approval decisions.
- **Tank reference gauging fields** — `ref_gauge_height` (Reference Gauge Height) and `datum_height` are now editable in the Tank Master form (previously DB-only).

### Changed
- **Review / record / exception dialogs centered in the viewport** — the page container's `view-transition-name` was (per CSS spec) the containing block for `position: fixed` descendants, so dialogs rendered top-aligned with hidden content; all three now render via a React portal to `document.body`.
- **Wider review dialog & larger default window** — dialog `max-w-3xl → max-w-5xl` (history table no longer needs a horizontal scrollbar); window `1400×900 → 1560×1000` (min `1280×800`) so 3–4 history rows are visible with vertical scrolling.
- **User Management** — added Edit-details and Remove-user actions (with username-uniqueness, password-reset ≥ 8 chars, last-active-Administrator and self-protection guards; all audited).

### Fixed
- **Reference Point / Reference Gauge Height validation** — both now require positive numbers (frontend zod + backend); `update_tank` audit now records old → new values for `reference_point`, `ref_gauge_height` and `datum_height` (previously only the tank number was logged).

---

## [0.3.0] - 2026-08-17

### Added
- **Single-line entry forms (U-5 / U-7)** — all data-entry screens restructured as one straight line where each field's name is the column heading and the input sits directly below it:
  - New Dip Entry (Date, Time, Shift, Tank No., Product Type, Ref Point, Gross/Auto/Radar/Water/Sludge Dip, Temperature, Unit, Density, Tank Status, Custom Status, Operator, Remarks)
  - Tank Master (13 columns incl. capability checkboxes)
  - Operator Master, Product Master, Tank Status Master
  - User Management (Username, Full Name, Password, Role)
  - Gauging Tolerance Rules (Settings)
  - Wide forms scroll horizontally instead of wrapping.
- **Temperature entry fix (U-5)** — temperature input cell widened and the °C/°F unit selector aligned inline (`flex` cell); the value is now fully visible and the unit cannot drift out of alignment.
- **Centered data tables (U-8)** — all list/history tables (dip records, masters, tolerances, users, audit log, exceptions, summaries) now center both headers and cell content (horizontal + vertical).
- **Error / access-denied navigation (U-6)** — the "Access Denied" page and the application error boundary now provide **Go to Dashboard**, **Try Again**, and **Log Out** actions; users no longer have to restart the application when they hit a role-based denial.
- **CHANGELOG.md** — this file.
- **Version alignment** — crate/package/config versions unified to 0.3.0 (`Cargo.toml` was stale at 0.1.8; `package.json`, `tauri.conf.json`, `src/version.ts` updated).

### Changed
- `NewDip.tsx`, `TankMaster.tsx`, `OperatorMaster.tsx`, `ProductMaster.tsx`, `TankStatusMaster.tsx`, `Users.tsx`, `Settings.tsx` — forms migrated to the shared `EntryLine` component (`src/components/EntryLine.tsx`).
- `index.css` — `.data-table` headers/cells centered; new `.entry-line` single-line form styles; `.temp-cell` inline temperature/unit layout.
- `ProtectedRoute.tsx`, `ErrorBoundary.tsx` — navigation actions on denial/error screens.

### Fixed
- Temperature value invisible / unit selector misaligned in New Dip Entry.
- Dead-end "Access Denied" and "Application Error" screens (previously forced an app restart).
- Inconsistent application version metadata across build files.

### Data / operations (applied to the deployed portable database, 17-Aug-2026)
- Foreign-key targets corrected on `dip_records` and `dip_rechecks` (`operators_old` → `operators`); named indexes restored.
- Gauging tolerance defaults seeded: Normal 10 mm / Attention 25 mm / Recheck 50 mm (Gross vs Auto, Gross vs Radar, Auto vs Radar).
- `Afternoon` shift re-activated; operator designation typo corrected; historical Safe-Fill violation flagged in the exceptions register.
- Automatic daily backup installed (Task Scheduler "TankFarmDipControl Auto Backup", 18:30, retention 14, `VACUUM INTO` snapshots).
- Legacy pre-migration database archived after completeness verification.

### Known limitations (code-pending)
- `foreign_keys` pragma still disabled at runtime (schema corrected; enforcement requires code change).
- App forces `journal_mode=delete` at startup (WAL attempt reverted; crash-safe journaling code-pending).
- Timestamp format consistency (UTC vs local) code-pending.
- `application.lock` not removed on exit (code-pending).
- Backend role-based enforcement (RBAC) code-pending.

---

## [0.2.0] - 2026-08-17

- Initial portable release: authentication + first-run admin bootstrap, Tank/Operator/Product/Shift/Tank-Status masters, dip recording with validation and auto-computed differences, Shift In-Charge review/approval workflow, physical recheck workflow, corrections workflow, exceptions/tolerance engine, shift closing, dashboard, CSV report export, SQLite backup/restore (VACUUM INTO), audit log, settings, portable layout (Data/Config/Logs/Reports/Backup/Temp beside the executable), migration from the user-local database.

[0.3.1]: https://github.com/malick186/Oil-Movement-Digital-Dip-Register/releases/tag/v0.3.1
[0.3.0]: https://github.com/malick186/Oil-Movement-Digital-Dip-Register/releases/tag/v0.3.0
[0.2.0]: https://github.com/malick186/Oil-Movement-Digital-Dip-Register/releases/tag/v0.2.0
