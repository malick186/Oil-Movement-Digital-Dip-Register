import { History } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  notes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'Unreleased (next)',
    date: '2026-08-17',
    notes: [
      'Notify the current user (toast + banner) when another PC tries to open the app from the shared folder.',
      '"In use" dialog now identifies the current holder by app-login username and role.',
      'Welcome page (overview, features, API MPMS theory, workflow) added to navigation.',
      'In-app Changelog page added.',
      'PRL logo panel made transparent (removed white background and border).',
      'README rewritten from scratch.',
    ],
  },
  {
    version: 'v0.3.1',
    date: '2026-08-17',
    notes: [
      'Same-tank previous history shown in the Dip Verification review card.',
      'Review / record / exception dialogs centered in the viewport (React portal fix).',
      'Wider review dialog and larger default window (1560×1000).',
      'User Management: edit details and remove users.',
      'Tank reference gauging fields (Ref Gauge Height, Datum Height) exposed, validated and audit-traced.',
    ],
  },
  {
    version: 'v0.3.0',
    date: '2026-08-17',
    notes: [
      'Single-line entry forms across New Dip and all master / user management screens.',
      'Temperature cell widened with inline °C/°F unit selector.',
      'All data tables centered (headers + cells).',
      'Access-denied / error screens now offer navigation (Go to Dashboard / Log Out).',
      'FK targets corrected, tolerance defaults seeded, auto-backup installed, legacy data archived.',
    ],
  },
  {
    version: 'v0.2.0',
    date: '2026-08-17',
    notes: ['Premium UI motion package.', 'Initial portable release with review/approval workflow, exceptions, shift closing, CSV reports, backup/restore, audit log.'],
  },
  {
    version: 'v0.1.9',
    date: '2026-08-17',
    notes: ['Operational simplifications across entry and verification flows.'],
  },
  {
    version: 'v0.1.8',
    date: '2026-08-17',
    notes: ['Portable executable filename versioned for easy tracking.'],
  },
  {
    version: 'v0.1.7',
    date: '2026-08-17',
    notes: ['Operational dashboard.', 'Expected-gauging shift closing.', 'Expanded exceptions.', 'Draft editing.'],
  },
  {
    version: 'v0.1.5',
    date: '2026-08-16',
    notes: ['First-run administrator setup.', 'Complete dip lifecycle and data integrity.', 'Secure backup restore.', 'Shift-closing blockers.'],
  },
  {
    version: 'v0.1.4',
    date: '2026-08-15',
    notes: ['Cross-compiled Windows executable.', 'Security audit: 6 critical + 7 high issues fixed.'],
  },
  {
    version: 'v0.1.3',
    date: '2026-08-14',
    notes: ['CI workflow fixes.', 'Role-based access control.', 'Portable database beside the executable.'],
  },
  {
    version: 'v0.1.2',
    date: '2026-08-13',
    notes: ['Bug fixes, new features, tests, and role-based access control.'],
  },
  {
    version: 'v0.1.1',
    date: '2026-08-12',
    notes: ['Early fixes and CI auto-build for Windows.'],
  },
  {
    version: 'v0.1.0',
    date: '2026-08-11',
    notes: ['Initial Tank Farm & Terminal Dip Recording Control Center.'],
  },
];

export default function Changelog() {
  return (
    <div className="space-y-5 anim-fade-up max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-dragon-text">Changelog</h2>
        <p className="text-xs text-dragon-text-muted mt-1">All changes from the very beginning to the current build.</p>
      </div>

      {CHANGELOG.map((entry) => (
        <div key={entry.version} className="glass-card p-5">
          <div className="flex items-baseline gap-3 mb-2">
            <History size={14} className="text-dragon-primary flex-none" />
            <h3 className="text-sm font-semibold text-dragon-text">{entry.version}</h3>
            <span className="text-[11px] text-dragon-text-muted">{entry.date}</span>
          </div>
          <ul className="text-xs text-dragon-text-secondary space-y-1 list-disc list-inside pl-5">
            {entry.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
