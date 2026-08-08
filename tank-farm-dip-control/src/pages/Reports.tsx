import { useState } from 'react';
import { FileText, Download } from 'lucide-react';

const reports = [
  { id: 'daily-dip', label: 'Daily Dip Report', desc: 'All dip records for a selected date' },
  { id: 'shift-summary', label: 'Shift Summary Report', desc: 'Dip summary by shift' },
  { id: 'tank-wise', label: 'Tank-wise Dip Report', desc: 'Dip records filtered by tank' },
  { id: 'exception-report', label: 'Exception Report', desc: 'All exceptions and tolerances' },
  { id: 'audit-trail', label: 'Audit Trail Report', desc: 'Complete audit log export' },
  { id: 'closing-report', label: 'Shift Closing Report', desc: 'Shift closure summary' },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleGenerate = () => {
    alert('Report generation will be available when the backend is connected.\n\nReport: ' + selectedReport + '\nPeriod: ' + (dateFrom || 'any') + ' to ' + (dateTo || 'any'));
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedReport(r.id === selectedReport ? null : r.id)}
            className={`text-left p-3 rounded border transition-colors ${
              selectedReport === r.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{r.label}</span>
            </div>
            <p className="text-xs text-slate-400">{r.desc}</p>
          </button>
        ))}
      </div>

      {selectedReport && (
        <div className="bg-white rounded border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Report Parameters</h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition-colors"
            >
              <Download size={14} />
              Generate Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
