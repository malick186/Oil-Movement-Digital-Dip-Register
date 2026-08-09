# Tank Farm Dip Control Center

Offline-first Windows desktop application for oil movement digital dip recording and tank farm management. Built with Tauri 2.x, React 19, and Rust.

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

## How to Run (Development)

```bash
npm install
npm run dev        # starts Vite dev server with HMR
```

```bash
cd src-tauri
cargo tauri dev    # starts full Tauri desktop window
```

## How to Build (Windows .exe)

```bash
npm run build                           # builds frontend to dist/
cd src-tauri
cargo build --release --target x86_64-pc-windows-gnu
# Binary at: target/x86_64-pc-windows-gnu/release/app.exe
```

Copy `app.exe`, `app_lib.dll`, and `WebView2Loader.dll` to the same folder to distribute.

## Requirements (End User)

- Windows 10 or Windows 11
- WebView2 Evergreen Runtime (pre-installed on most Win10/11)
- No installation, no admin rights, no internet required

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
