# Tank Farm Dip Control Center

Offline-first Windows desktop application for oil movement digital dip recording and tank farm management. Built with Tauri 2.x, React 19, and Rust.

The interface uses Pakistan Refinery Limited's current corporate logo and a PRL-derived green, navy and blue color system across light and dark modes. The logo asset is sourced from the [official PRL website](https://www.prl.com.pk/wp-content/uploads/2025/03/PRL_NEW_LOGO.png) and remains a Pakistan Refinery Limited trademark.

## Features

### Operations
| Module | Description |
|---|---|
| **Dashboard** | 6 stat cards (Active Tanks, Dips Completed, Awaiting Review, Recheck Required, Abnormal Diff, Approved) with shift status indicator |
| **New Dip** | Create dip records with tank/product/operator selection, auto/radar/water/sludge readings, temperature, density, tank status |
| **Dip Verification** | Review pending dip records — approve, reject, or mark for recheck with detailed record modals |
| **Shift Closing** | View active shifts with status cards, close shifts with remarks, view closing history |
| **Tank Status** | Overview of all tanks with attention-worthy readings, severity badges (recheck/attention/normal), click-through to tank detail |
| **Exceptions** | View tolerance violations and anomalies, resolve with remarks |

### Data Management
| Module | Description |
|---|---|
| **Dip History** | Filterable table of all dip records with drag-and-drop column reorder |
| **Tank Trends** | Interactive Recharts line/area chart showing gross, auto, and radar dip readings over time per tank |
| **Reports** | Generate and export as CSV: Daily Dip, Shift Summary, Tank-wise, Exception, Audit Trail, Shift Closing reports with date/tank filters |
| **Audit Log** | Filterable log of all system actions with timestamps, users, old/new values |

### Master Data
| Module | Description |
|---|---|
| **Tank Master** | CRUD with 20 fields — physical parameters, boolean flags, numeric measurements with react-hook-form + Zod validation |
| **Product Master** | CRUD for oil/petroleum product types with active/inactive toggle |
| **Operator Master** | CRUD for operators with employee ID, designation, shift group |
| **Tank Status Master** | CRUD for tank status definitions (In Service, Maintenance, Cleaning) with display ordering |
| **Users** | Create users, toggle active/inactive with role assignment (Shift Supervisor, Shift In-Charge, Administrator) |

### System
| Module | Description |
|---|---|
| **Settings** | Editable tolerance limits (normal, attention, recheck), read-only application settings, seed sample data |
| **Backup & Restore** | Create and restore SQLite database backups with file size display and confirmation dialog |

## Architecture

```
tank-farm-dip-control/
├── src/                          # React frontend
│   ├── components/               # DragTable, ErrorBoundary, PageTransition, ProtectedRoute, ToastContainer
│   ├── layouts/                  # MainLayout (sidebar, header, theme toggle)
│   ├── pages/                    # 19 page components
│   ├── services/                 # api.ts — 35 Tauri IPC invoke wrappers
│   ├── store/                    # Zustand: appStore, authStore, themeStore, toastStore
│   ├── types/                    # TypeScript type definitions
│   └── validation/               # Zod schemas for all forms
├── src-tauri/                    # Rust backend
│   └── src/
│       ├── commands/             # 10 command modules (auth, dashboard, dips, masters, etc.)
│       ├── models.rs             # Data structures with serde serialization
│       ├── db.rs                 # SQLite schema (18 tables)
│       └── lib.rs                # 35 Tauri commands registered
└── portable-windows/             # Pre-built standalone .exe, .dll files
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop Shell** | Tauri 2.x (custom-protocol, protocol-asset) |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| **State** | Zustand 5 |
| **Forms** | react-hook-form + Zod |
| **Charts** | Recharts 3 |
| **Database** | SQLite (rusqlite) |
| **Backend** | Rust (cross-compiled `x86_64-pc-windows-gnu`) |
| **Auth** | Username/password with session-based auth |

## UI/UX Design System

- **Dragon dark theme** with 18 CSS custom properties (`--dr-*` tokens)
- **Light/dark mode toggle** in header bar, persisted to localStorage
- **Glass-morphism**: cards, panels, stat cards with backdrop-blur
- **3D navigation**: perspective transforms on sidebar with active indicator
- **Page transitions**: View Transitions API with CSS fallback
- **Toast notifications**: slide-in animations with Web Audio API sound feedback (oscillator tones)
- **Drag-and-drop**: column reorder on Dip History table (localStorage persistence)
- **Print support**: `@media print` CSS for Reports page (A4, hides chrome)
- **Modals**: glass depth layers with multi-layer blur stacking
- **Loading states**: skeleton spinners on all data pages
- **Error handling**: toast feedback on all 15+ pages (no silent failures)
- **Accessibility**: aria-live on toast container
- **Fonts**: Poppins (UI) + JetBrains Mono (data)

## First Run

1. Extract the complete portable folder to its final writable location. A secured PRL shared folder may be used when all authorized users have read/write permission.
2. Run `Tank Farm Dip Control.exe` as a normal Windows user. Do not use **Run as administrator**.
3. When no users exist, the application opens the one-time Administrator Setup screen. Create the initial local Administrator; no reusable or demo password is provided.
4. Sign in and configure Tank, Product, Operator, Tank Status and tolerance master data before operational use. Initial reference roles, shifts, locations, product types and tank statuses are created safely on first start; sample operational data is optional and Administrator-controlled.

All application-created files stay beside `Tank Farm Dip Control.exe`:

| Folder | Contents |
|---|---|
| `Data` | Live SQLite database: `tank_farm_dip.db` |
| `Backup` | Manual and pre-restore safety backups |
| `Logs` | Rotating application diagnostic logs |
| `Reports` | CSV report exports |
| `Config` | Shared-folder instance lock and future configuration files |
| `Temp` | WebView2 profile/cache and process temporary files |

On the first v0.1.8 start, if `Data\tank_farm_dip.db` does not exist but the earlier v0.1.7 user-local database exists, the application validates and copies it into portable storage using SQLite's backup API. The source database is retained as a safety copy.

## Shared Folder Operating Rule

The same portable folder and records can be used by Shift Supervisors and Shift In-Charges through shortcuts. Only one running application instance is permitted against that folder at a time. If another user already has it open, the second user receives an **Application in Use** message and must wait until the first user closes it. This safeguard is mandatory because an ordinary SQLite database must not be edited concurrently by separate computers over an SMB/network share.

SQLite uses rollback-journal mode with full synchronization instead of WAL mode for this portable/shared-folder deployment. Do not copy only the `.exe`; keep the executable and its generated folders together, and ensure the shared location is included in PRL's normal backup arrangements.

## How to Run (Development)

```bash
npm install
npm run dev        # starts Vite dev server with HMR
```

```bash
npm run dev         # frontend-only development server
npm run tauri dev   # full Tauri desktop window
```

## How to Build (Windows .exe)

```bash
npm ci
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo build --release --manifest-path src-tauri/Cargo.toml
npx tauri build --no-bundle
```

The portable application executable is created at `src-tauri/target/release/app.exe`. Rename it to `Tank Farm Dip Control.exe` when preparing the delivery folder. A built application does not require Node.js, Rust, a server, or an internet connection at runtime.

## Requirements (End User)

- Windows 10 or Windows 11
- Microsoft Edge WebView2 Runtime (normally included with supported Windows 10/11 corporate images; verify it during deployment because this portable build does not download it)
- No installation, no admin rights, no internet required

## Offline Deployment Validation

- Copy the complete portable folder to a standard-user Windows 10/11 test account.
- Disconnect network access and launch the executable without elevation.
- Complete first-run Administrator setup against the portable `Data\tank_farm_dip.db` database.
- Restart the application and verify the same records persist.
- Exercise backup/restore and confirm the pre-restore safety snapshot appears in the backup list.
- Corporate application-control policy may still require IT to allow-list the executable and WebView2 loader; this is separate from administrator rights.

## Downloads

Pre-built binaries available at [GitHub Releases](https://github.com/malick186/Oil-Movement-Digital-Dip-Register/releases).

## Database

SQLite database created automatically on first run. Schema includes 18 tables:

| Table | Purpose |
|---|---|
| `users` | Application users with roles and active status |
| `roles` | Role definitions |
| `tanks` | Tank master data (20+ fields) |
| `products` | Product catalog |
| `operators` | Operator/employee records |
| `tank_statuses` | Tank status definitions |
| `dip_records` | Core dip measurement records |
| `dip_reviews` | Review history with actions |
| `dip_rechecks` | Recheck requests and decisions |
| `dip_corrections` | Correction requests and approvals |
| `shift_closings` | Shift closure records |
| `tolerance_settings` | Configurable tolerance limits per tank/product/location |
| `exceptions` | Tolerance violations and anomalies |
| `audit_logs` | Complete change tracking |
| `application_settings` | System configuration key-value store |
| `shifts`, `locations` | Reference data tables |

### Tolerance System

Configurable three-tier tolerance limits:
- **Normal**: within acceptable range
- **Attention**: flagged for review
- **Recheck**: requires re-measurement

Auto-calculated differences: gross_auto_difference, gross_radar_difference, auto_radar_difference.

## License

Proprietary. All rights reserved.
