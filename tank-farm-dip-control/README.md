# Tank Farm & Terminal Dip Recording Control Center

A **local-first, offline-first Windows desktop application** for recording and verifying manual tank
**dip (innage) readings** at an oil-movement tank farm. It replaces the paper dip register with an
audited digital workflow — operator entry, Shift In-Charge review/approval, tolerance-based exceptions,
physical rechecks, corrections, shift closing, CSV reporting and SQLite backup/restore.

Built with **Tauri 2 (Rust) + React 19 + TypeScript + Vite + Tailwind CSS 4**, with a **PRL-branded**
green/navy UI in light and dark modes. The PRL logo is a Pakistan Refinery Limited trademark
(sourced from the [official PRL website](https://www.prl.com.pk)).

---

## What it does

- **Dip entry** — gross, auto (ATG), radar, water and sludge dips, plus temperature and density.
- **Review & approval chain** — Shift Supervisor submits → Shift In-Charge approves / rejects / requests recheck.
- **Tolerance engine** — Normal / Attention / Recheck limits (per tank/product) that auto-raise exceptions.
- **Recheck & correction workflows** for doubtful or wrongly-recorded values.
- **Shift closing** with expected-gauging checks and unresolved-record blockers.
- **Reporting** — CSV export (daily, shift summary, tank-wise, exceptions, audit, closing).
- **Audit log** of every state change, **backup/restore** (consistent `VACUUM INTO` snapshots), portable storage.

### Industry basis (brief)

Tank gauging follows the **API Manual of Petroleum Measurement Standards (MPMS)**:

| Standard | What it governs (as used here) |
|---|---|
| **API MPMS Ch. 3.1A** | Manual gauging — *innage* (datum plate → liquid surface) vs *outage/ullage*; calibrated tape; water-finding paste for the water dip |
| **API MPMS Ch. 3.1B** | Automatic (radar/servo) tank gauging — the Auto / Radar Dip comparison |
| **API MPMS Ch. 7** | Temperature determination |
| **API MPMS Ch. 9.1 / ASTM D1298** | Density (hydrometer method) |
| **API MPMS Ch. 12.2 / ASTM D1250** | Volume correction and rounding |

Each dip record stores a **reference point snapshot** so historical readings remain traceable even if the
tank's reference gauge height is later re-calibrated.

### User roles

| Role | Responsibility |
|---|---|
| **Administrator** | Masters (Tank / Product / Operator / Tank Status), Users, Settings, Backup & Restore, Audit Log |
| **Shift Supervisor** | Records and submits dip observations |
| **Shift In-Charge** | Reviews, approves / rejects / requests recheck, closes the shift |
| **Operator** | The person who physically takes the dip (recorded via Operator Master; no login) |

---

## Features

### Operations
| Module | Description |
|---|---|
| **Welcome** | App overview, feature tour, API MPMS theory, and the step-by-step workflow |
| **Dashboard** | Stat cards (active tanks, dips completed, awaiting review, recheck required, abnormal diffs, approved) + shift status |
| **New Dip** | Single-line entry form with tank/product/operator selection, all readings, temperature (°C/°F), density, tank status |
| **Dip Verification** | Review pending records with the tank's **previous history**, approve / reject / request recheck |
| **Shift Closing** | Close shifts with remarks, totals and blocking checks |
| **Tank Status** | Tank overview with attention severity and click-through detail |
| **Exceptions** | Tolerance violations with resolve-with-remark |

### Data & records
| Module | Description |
|---|---|
| **Dip History** | Filterable table with drag-and-drop column reorder |
| **Tank Trends** | Recharts line/area charts of gross/auto/radar over time per tank |
| **Reports** | CSV exports (daily dip, shift summary, tank-wise, exceptions, audit, closing) |

### Master data & system
| Module | Description |
|---|---|
| **Tank / Product / Operator / Tank Status Masters** | Single-line CRUD forms with validation |
| **Users** | Create, **edit details**, **remove**, and toggle active (role-based) |
| **Settings** | Tolerance limits (Normal ≤ Attention ≤ Recheck), operational controls, reference-data seeding |
| **Backup & Restore** | Consistent SQLite snapshots with safe restore validation |
| **Audit Log** | Filterable action trail with old/new values |
| **Changelog** | In-app list of all changes from the first release |

---

## Architecture

```
tank-farm-dip-control/
├── src/                     # React + TypeScript frontend (Vite)
│   ├── components/          # EntryLine, DragTable, ProtectedRoute, ErrorBoundary, ToastContainer, PageTransition
│   ├── layouts/             # MainLayout (sidebar, header, theme, access-request banner)
│   ├── pages/               # 21 page components (Welcome, Changelog, + 19 screens)
│   ├── services/api.ts      # Tauri IPC wrappers
│   ├── store/               # Zustand: app, auth, theme, toast
│   ├── types/               # TypeScript types
│   └── validation/          # Zod schemas
├── src-tauri/               # Rust backend
│   └── src/
│       ├── commands/        # auth, dips, verification, masters, backup, reports, settings, dashboard,
│       │                    # exceptions, shift_closing, audit, bootstrap
│       ├── models.rs        # serde data structures
│       ├── db.rs            # SQLite schema (18 tables)
│       ├── storage.rs       # portable folders + shared-folder instance lock + access coordination
│       └── lib.rs           # command registration + access-request watcher
└── portable-windows/        # Pre-built standalone .exe + .dlls
```

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2.x (Rust), WebView2 |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| State / forms | Zustand 5 · react-hook-form + Zod |
| Charts | Recharts 3 |
| Database | SQLite (rusqlite, bundled) |
| Auth | Username/password (bcrypt), role-based |

---

## Getting started (end user)

1. Extract the **complete portable folder** to a writable location (e.g. a secured IT shared drive).
2. Run `Tank Farm Dip Control v0.3.1.exe` as a **normal user** (not "Run as administrator").
3. On first run, create the **Administrator** account (no default/demo password exists).
4. Configure **Tank / Product / Operator / Tank Status masters** and the approved **tolerances** before operational use.

**Requirements:** Windows 10/11 x64 + the Microsoft Edge **WebView2 Runtime** (usually pre-installed; verify it, since this portable build does not download it). No installation, admin rights, server or internet needed at runtime.

### Storage (beside the executable)

| Folder | Contents |
|---|---|
| `Data` | Live SQLite database (`tank_farm_dip.db`) |
| `Backup` | Manual + automatic (`Backup\auto`) snapshots |
| `Logs` | Diagnostic logs |
| `Reports` | CSV exports |
| `Config` | Shared-folder lock + access-request files |
| `Temp` | WebView2 profile/cache |

### Shared-folder operating rule

The same folder can be used by several users **one at a time**. When a second user tries to open it:

- The second user sees an **"In Use"** dialog (who is using it, with Retry/Exit).
- The current user gets a **toast + banner** — *"[name] is trying to open the application"* — and can dismiss it.

This is enforced because an SQLite database must **not** be edited concurrently by separate PCs over an
SMB/network share. Point `Backup\auto` at OneDrive or the corporate backup target for off-site copies.

---

## Development

```bash
npm install
npm run dev          # Vite dev server (HMR)
npm run tauri dev    # full desktop window
```

## Build (Windows)

```bash
npm ci
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo build --release --manifest-path src-tauri/Cargo.toml
```

The portable executable is produced at `src-tauri/target/release/app.exe`; rename it to
`Tank Farm Dip Control v<version>.exe` for the delivery folder (the CI workflow does this automatically).
A built app needs **no** Node/Rust/server/internet at runtime.

---

## Database

SQLite, created automatically on first run (18 tables): `users`, `roles`, `tanks`, `products`, `operators`,
`tank_statuses`, `dip_records`, `dip_reviews`, `dip_rechecks`, `dip_corrections`, `shift_closings`,
`tolerance_settings`, `exceptions`, `audit_logs`, `application_settings`, `shifts`, `locations`.

**Tolerances:** three tiers — **Normal** (within range), **Attention** (flagged), **Recheck** (re-measure) —
with auto-computed differences: gross−auto, gross−radar, auto−radar.

---

## Known limitations (documented, code-pending)

- SQLite `foreign_keys` enforcement is disabled at runtime (schema targets were corrected at the data level).
- The app uses rollback-journal mode (`journal_mode=delete`); WAL is intentionally avoided for the shared folder.
- Timestamp storage mixes UTC (`datetime('now')`) and local ISO formats.
- `Config/application.lock` is not removed on exit (stale file; harmless — overwritten on next start).
- Role checks are enforced per command, but the "in-use" coordination is best-effort over the share.
- Binaries are unsigned (Windows SmartScreen may warn); no auto-updater; CSV-only reporting.

---

## Releases & changelog

- Downloads: [GitHub Releases](https://github.com/malick186/Oil-Movement-Digital-Dip-Register/releases)
- Full change history: `CHANGELOG.md` and the in-app **Changelog** screen.

## License

Proprietary. All rights reserved.
