# Tank Farm & Terminal Dip Recording Control Center

A **local-first, offline-first Windows desktop application** for recording, verifying, approving, tracking and reviewing tank gauging (dip) observations at an Oil Movement / Tank Farm / Oil Terminal.

It digitizes the paper **Tank Dip Register + Gauging Verification + Shift Closing** process into an audited workflow, with **PRL-branded** industrial UI (light/dark) and full data traceability. Built with **Tauri 2 (Rust) + React 19 + TypeScript + Vite + Tailwind CSS 4 + SQLite**.

> **Status:** v0.3.2 — production-oriented portable build. The PRL logo is a Pakistan Refinery Limited trademark.

---

## 1. Application purpose

The operational workflow it replaces:

1. Field Operator performs tank gauging (dip / innage).
2. Shift Supervisor records the observations.
3. Gross / Auto (ATG) / Radar readings are captured together.
4. Differences are calculated automatically.
5. Tolerances are evaluated automatically.
6. Shift In-Charge reviews → **Approve / Recheck / Reject**.
7. Shift is closed; approved records become permanent history with an audit trail.

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2.x (Rust), WebView2 |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| State / forms | Zustand 5 · react-hook-form + Zod |
| Charts | Recharts 3 |
| Database | SQLite (rusqlite, bundled) |
| Auth | Local username/password (bcrypt), role-based |

Fully **offline** — no internet, cloud, server, SQL Server/PostgreSQL, external auth, admin rights, or runtime Node.js required. No telemetry, no cloud sync.

---

## 3. User roles

| Role | Capabilities |
|---|---|
| **Shift Supervisor** | Create/submit dip records, select tank/product/operator, enter all readings, correct unapproved records, request correction of approved records, view history |
| **Shift In-Charge** | Review/approve/reject/request recheck, review remarks, approve corrections, close shift, review exceptions/reports/trends |
| **Administrator** | Tank/Product/Operator/Tank Status masters, Users, Settings (tolerances, thresholds), Backup & Restore, Audit Log |
| **Operator** | The person who physically takes the dip — recorded via Operator Master (no login required) |

Backend authorization protects commands; the UI never relies on hidden buttons alone.

---

## 4. Core workflow

```
Operator Performs Dip → Shift Supervisor Records Dip → Gross/Auto/Radar Comparison
→ Automatic Difference Calculation → Tolerance Evaluation → Shift In-Charge Review
→ Approve / Recheck / Reject → Shift Closing → Permanent History + Audit Trail
```

---

## 5. Navigation

**OVERVIEW** — Welcome (app overview, feature tour, API MPMS theory, workflow), Changelog
**OPERATIONS** — Dashboard · New Dip · Dip Verification · Shift Closing · Tank Status · Exceptions
**RECORDS** — Dip History · Tank Trends · Reports
**MASTER DATA** — Tank Master · Product Master · Operator Master · Tank Status Master
**SYSTEM** — Users · Settings · Backup & Restore · Audit Log · Changelog

The sidebar shows the logged-in user, role, and application version.

---

## 6. Dip record — required fields

| Field | Notes |
|---|---|
| Date / Time | `HH:MM` 24-hour |
| Tank No. | from Tank Master |
| Product Type | from Product Master (Crude, HSFO, HSD, MS, Naphtha — extensible) |
| Reference Point | auto-filled from Tank Master; read-only during entry |
| Gross / Auto / Radar Dip | mm |
| Water Dip / Sludge Dip | mm (zero allowed) |
| Temperature | °C / °F (unit stored with the value) |
| Density | numeric, configurable precision |
| Tank Status | dropdown from Tank Status Master (+ custom "Other") |
| Dip Performed By | operator from Operator Master |
| Remarks | free text |

System-generated: unique record number (`DIP-YYYYMMDD-NNNN`), location, shift, entered by/at, reviewed by/at, approval status/at, correction status, audit info.

### Reference point snapshot
Each record stores a **reference point snapshot** at entry time. If the tank's Reference Gauge Height / Reference Point is later changed in Tank Master, **historical records keep the value that was in effect when recorded**.

---

## 7. Screens

### Dashboard
Current-shift card (date, shift, start/end, supervisor, in-charge), KPI cards (active tanks, tanks expected, dips completed/pending, awaiting review, recheck required, abnormal difference, approved, shift-closing status), and an **Attention Required** table with quick actions (Record New Dip, Review Pending, Shift Closing, Exceptions).

### New Dip Entry (single-line form)
All fields on one straight line with column headings; temperature has an inline °C/°F selector. The form auto-fills Reference Point from Tank Master, warns when it is missing, disables Auto/Radar when not available, and shows a **Dip Comparison** panel (Gross vs Auto / Gross vs Radar / Auto vs Radar) with **WITHIN TOLERANCE / ATTENTION REQUIRED / RECHECK REQUIRED** status.

### Dip Verification
Shift In-Charge review of pending records with the tank's **previous history** (last 10 readings) for context; actions: **Approve / Recheck Required / Reject**, with mandatory remarks for recheck/reject.

### Shift Closing
Expected-tank gauging list with completeness/blockers (missing dip, pending review, recheck pending, required radar/auto missing, operator/status missing); explicit close by Shift In-Charge with totals.

### Tank Status Board & Tank Detail
All active tanks; detail shows master info, latest observation, verification, history and trends.

### Dip History / Tank Trends / Reports
Filterable history (date, tank, product, shift, operator, status, difference threshold); per-tank trends (gross/auto/radar, water/sludge, temperature, density); **CSV** report export (daily, shift summary, tank-wise, exceptions, audit, closing).

### Exceptions
Tolerance violations and anomalies with severity, actual vs expected, status, resolution. Types: Gross vs Auto / Gross vs Radar / Auto vs Radar difference, missing gross/auto/radar dip, unusual water/sludge dip, missing temperature/density, dip above safe fill, below min operating level, water above reference gauge height.

### Audit Log
Append-only trail (login/logout, dip create/update/submit/review/approve/reject, recheck, correction, shift close, master changes, tolerance changes, backup/restore, user create/edit/delete/toggle) with old/new values and reasons. Not editable by users.

### Users / Settings / Backup & Restore
Users: create, **edit details**, **remove**, toggle active (role-based, with guards: no self-removal, ≥1 active Administrator). Settings: tolerance configuration and operational controls. Backup & Restore: consistent `VACUUM INTO` snapshots with restore validation.

---

## 8. Tolerance system

Configurable three-tier limits per **Tank / Product / Location** and comparison type:

- **Normal** — within approved limit
- **Attention** — flagged for review
- **Recheck Required** — exceeds approved limit (re-measure)

Comparison types: Gross vs Auto, Gross vs Radar, Auto vs Radar. Limits are **not hardcoded** — defaults are sample values; set approved SOP limits before operational use.

---

## 9. Validation & data integrity

- Numeric readings non-negative; validated against tank dimensions where available.
- Water/sludge: unusual increase vs previous reading flagged (configurable threshold) but **not auto-rejected** — reviewer decides.
- Temperature stored with its unit (no silent conversion of the original observation).
- Duplicate protection (tank + date + time + shift) warns before saving; never silently deletes.
- Approved records are immutable: corrections require a reason, preserve original values, and need re-approval.
- Recheck preserves the original observation and records recheck readings separately.
- **Accountability:** Dip Performed By, Entered By, and Reviewed/Approved By remain distinct identities.

---

## 10. Data model (SQLite)

Tables: `users`, `roles`, `locations`, `shifts`, `tanks`, `products`, `operators`, `tank_statuses`,
`dip_records`, `dip_reviews`, `dip_rechecks`, `dip_corrections`, `shift_closings`,
`tolerance_settings`, `exceptions`, `audit_logs`, `application_settings`.

`dip_records` captures: `record_number`, `date`, `time`, `shift_id`, `tank_id`, `product_id`,
`reference_point_snapshot`, `gross_dip_mm`, `auto_dip_mm`, `radar_dip_mm`, `water_dip_mm`,
`sludge_dip_mm`, `temperature`, `temperature_unit`, `density`, `tank_status_id`,
`custom_tank_status`, `operator_id`, `remarks`, `gross_auto_difference`, `gross_radar_difference`,
`auto_radar_difference`, `entered_by/at`, `review_status`, `reviewed_by/at`, `approval_status`,
`approved_by/at`, `record_status`.

Schema migrations are forward-safe (no deleting the DB on upgrade).

---

## 11. Storage & deployment

Portable layout — all data stays **beside the executable**:

| Folder | Contents |
|---|---|
| `Data` | `tank_farm_dip.db` |
| `Backup` | manual + automatic (`Backup\auto`) snapshots |
| `Logs` | diagnostic logs |
| `Reports` | CSV exports |
| `Config` | shared-folder lock + access coordination files |
| `Temp` | WebView2 profile/cache |

**Requirements:** Windows 10/11 x64 + WebView2 Runtime. No install, no admin rights, no internet.

### Shared-folder operating rule
The same folder can be used by several users **one at a time**. A second user opening the app sees an
**"In Use"** dialog (who is using it, Retry/Exit); the current user is notified via a toast + banner
(*"[name] is trying to open the application"*). This prevents concurrent SQLite writes over an SMB share.
Point `Backup\auto` at OneDrive or the corporate backup target for off-site copies.

---

## 12. Security & OT/DCS boundary

- Passwords hashed (bcrypt), never plaintext; sessions not persisted across launches.
- Backend enforces roles per command (`require_roles`).
- **No direct connection** to DCS / PLC / SCADA / OPC / Historian / radar / ATG / Modbus networks.
- Auto and Radar readings are entered **manually**; a future read-only integration module is designed for, not built in.

---

## 13. Architecture & code structure

```
tank-farm-dip-control/
├── src/                     # React + TypeScript frontend
│   ├── components/          # EntryLine, DragTable, ProtectedRoute, ErrorBoundary, ToastContainer, PageTransition
│   ├── layouts/             # MainLayout (sidebar, header, theme, access-request banner)
│   ├── pages/               # Welcome, Changelog + 19 screens
│   ├── services/api.ts      # Tauri IPC wrappers
│   ├── store/               # Zustand (app, auth, theme, toast)
│   ├── types/               # TypeScript types
│   └── validation/          # Zod schemas
├── src-tauri/               # Rust backend
│   └── src/
│       ├── commands/        # auth, dips, verification, masters, backup, reports, settings, dashboard,
│       │                    # exceptions, shift_closing, audit, bootstrap
│       ├── models.rs / db.rs / storage.rs / util.rs / lib.rs
└── portable-windows/        # Pre-built standalone .exe + .dlls
```

---

## 14. Building & running

```bash
npm install
npm run dev          # Vite dev server
npm run tauri dev    # full desktop window
```

Build (Windows portable exe):

```bash
npm ci && npm test && npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo build --release --manifest-path src-tauri/Cargo.toml
```

Rename `src-tauri/target/release/app.exe` to `Tank Farm Dip Control v<version>.exe` for delivery (CI does this automatically).

---

## 15. Known limitations (documented, code-pending)

- SQLite `foreign_keys` enforcement disabled at runtime (schema targets corrected at the data level).
- Rollback-journal mode (`journal_mode=delete`); WAL avoided for the shared folder.
- Mixed timestamp formats (UTC vs local) in some columns.
- `Config/application.lock` not removed on exit (harmless — overwritten on next start).
- Unsigned binaries (SmartScreen may warn); no auto-updater; CSV-only reporting.

---

## 16. Roadmap

- **Phase 1 — Core** (shipped): Tauri shell, auth, navigation, dashboard, masters, dip entry, reference point, differences, verification, approval, history, audit, backup/restore.
- **Phase 2 — Shift control** (shipped): expected-gauging list, missing-dip detection, recheck workflow, shift closing, tank status board, exception center.
- **Phase 3 — Analytics** (shipped): trends, difference/water/sludge/temperature/density trends, reports.
- **Phase 4 — Petroleum calculations** (future): observed/standard volume, free-water, temperature & density correction, mass, ullage — only after approved **API/ASTM** standards and Tank Calibration Tables are provided. V1 focuses on recording and verification.

---

## 17. Releases & changelog

- Downloads: [GitHub Releases](https://github.com/malick186/Oil-Movement-Digital-Dip-Register/releases)
- Full history: `CHANGELOG.md` and the in-app **Changelog** screen.

## License

Proprietary. All rights reserved.
