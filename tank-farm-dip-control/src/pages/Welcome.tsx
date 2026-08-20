import { AlertTriangle, BookOpen, ClipboardCheck, Shield, Workflow } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="space-y-5 anim-fade-up max-w-5xl">
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-dragon-text">Welcome to the Tank Farm &amp; Terminal Dip Recording Control Center</h2>
        <p className="text-sm text-dragon-text-secondary mt-2 leading-relaxed">
          A local-first, portable application for recording and verifying manual tank
          <strong> dip (innage) readings</strong> at the oil movement tank farm. It replaces the paper dip register with an
          audited digital workflow — operator entry, Shift In-Charge review/approval, tolerance-based
          exception handling, shift closing, and CSV reporting — while keeping every reading traceable to the
          reference gauge height recorded for that tank.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-dragon-text mb-3 flex items-center gap-2"><Workflow size={16} className="text-dragon-primary" /> What it does</h3>
          <ul className="text-xs text-dragon-text-secondary space-y-1.5 list-disc list-inside">
            <li>Digital <strong>dip entry</strong> — gross, auto, radar, water &amp; sludge dip, temperature, density.</li>
            <li>Role-based <strong>review &amp; approval</strong> chain (Shift Supervisor → Shift In-Charge).</li>
            <li>Automatic <strong>exception &amp; tolerance</strong> evaluation (Normal / Attention / Recheck).</li>
            <li><strong>Physical recheck</strong> and <strong>correction</strong> workflows for doubtful records.</li>
            <li><strong>Shift closing</strong>, gauging dashboard, tank trends and CSV <strong>reports</strong>.</li>
            <li>Full <strong>audit log</strong>, SQLite <strong>backup/restore</strong>, and portable single-folder storage.</li>
          </ul>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-dragon-text mb-3 flex items-center gap-2"><Shield size={16} className="text-dragon-primary" /> User roles</h3>
          <div className="space-y-2 text-xs">
            <div><span className="text-dragon-text font-medium">Administrator</span><span className="text-dragon-text-secondary"> — masters (Tank / Product / Operator / Status), Users, Settings, Backup &amp; Restore, Audit Log.</span></div>
            <div><span className="text-dragon-text font-medium">Shift Supervisor</span><span className="text-dragon-text-secondary"> — records dip observations and submits them for verification.</span></div>
            <div><span className="text-dragon-text font-medium">Shift In-Charge</span><span className="text-dragon-text-secondary"> — reviews, approves / rejects / requests recheck, closes the shift.</span></div>
            <div><span className="text-dragon-text font-medium">Operator</span><span className="text-dragon-text-secondary"> — the person who physically takes the dip (recorded via Operator Master).</span></div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-dragon-text mb-3 flex items-center gap-2"><BookOpen size={16} className="text-dragon-primary" /> Industry basis (API MPMS — brief)</h3>
        <p className="text-xs text-dragon-text-secondary leading-relaxed">
          Tank gauging follows the <strong>API Manual of Petroleum Measurement Standards (MPMS)</strong>. This application
          records the measurements that those standards govern:
        </p>
        <ul className="text-xs text-dragon-text-secondary space-y-1 mt-2 list-disc list-inside">
          <li><strong>API MPMS Ch. 3.1A</strong> — Manual gauging of petroleum: <em>innage</em> (depth from the datum plate up to the liquid surface) vs <em>outage/ullage</em> (surface up to the reference gauge height), use of a calibrated tape, and water-finding paste for the water dip.</li>
          <li><strong>API MPMS Ch. 3.1B</strong> — Automatic (radar/servo) tank gauging systems, used for the Auto / Radar Dip comparison.</li>
          <li><strong>API MPMS Ch. 7</strong> — Temperature determination (the dip is corrected for temperature and density).</li>
          <li><strong>API MPMS Ch. 9.1 / ASTM D1298</strong> — Density (hydrometer method).</li>
          <li><strong>API MPMS Ch. 12.2 / ASTM D1250</strong> — Volume correction and rounding tables.</li>
        </ul>
        <p className="text-xs text-dragon-text-secondary leading-relaxed mt-2">
          <strong>Key terms used in this app:</strong> <em>Reference Gauge Height (RGH)</em> — the fixed distance from the datum
          plate to the gauge point at the hatch; <em>datum plate</em> — the zero reference at the tank bottom; <em>water dip</em> — the
          height of any free water layer (interface). Each dip record stores a <em>reference point snapshot</em> so historical
          readings stay traceable even if the tank's reference is later re-calibrated.
        </p>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-dragon-text mb-3 flex items-center gap-2"><ClipboardCheck size={16} className="text-dragon-primary" /> How the application works</h3>
        <ol className="text-xs text-dragon-text-secondary space-y-1.5 list-decimal list-inside">
          <li><strong>Setup (Administrator)</strong> — create the first admin, then Tank / Product / Operator / Tank Status masters and the approved gauging tolerances.</li>
          <li><strong>Dip entry (Shift Supervisor)</strong> — select the tank, enter the readings; the form auto-fills the Reference Point from Tank Master and computes Gross−Auto / Gross−Radar / Auto−Radar differences.</li>
          <li><strong>Submit</strong> — the record is submitted to the Shift In-Charge; duplicate detection and validation run first.</li>
          <li><strong>Verification (Shift In-Charge)</strong> — review against the same tank's previous history; approve, reject, or request a physical recheck.</li>
          <li><strong>Exceptions</strong> — readings outside the Normal/Attention/Recheck tolerance generate exceptions that must be resolved with a remark.</li>
          <li><strong>Shift closing</strong> — confirms every expected tank was gauged and no records are pending.</li>
          <li><strong>Reporting &amp; audit</strong> — CSV export, full audit trail, and SQLite backups keep the register complete and recoverable.</li>
        </ol>
      </div>

      <div className="notice-banner info flex items-center gap-2">
        <AlertTriangle size={15} className="flex-none" />
        <span className="text-xs">
          The application is single-user per shared folder — only one person can edit at a time. Configure Tank Master and
          approved SOP tolerances before operational use.
        </span>
      </div>
    </div>
  );
}
