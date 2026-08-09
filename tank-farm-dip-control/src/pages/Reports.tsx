import { useState } from 'react';
import * as api from '../services/api';
import type { Tank } from '../types';
import { FileText, Download } from 'lucide-react';

type ReportType = 'daily-dip' | 'shift-summary' | 'tank-wise' | 'exception-report' | 'audit-trail' | 'closing-report';

interface ReportDef {
  id: ReportType;
  label: string;
  desc: string;
}

const reports: ReportDef[] = [
  { id: 'daily-dip', label: 'Daily Dip Report', desc: 'All dip records for a selected date' },
  { id: 'shift-summary', label: 'Shift Summary Report', desc: 'Dip summary by shift' },
  { id: 'tank-wise', label: 'Tank-wise Dip Report', desc: 'Dip records filtered by tank' },
  { id: 'exception-report', label: 'Exception Report', desc: 'All exceptions and tolerances' },
  { id: 'audit-trail', label: 'Audit Trail Report', desc: 'Complete audit log export' },
  { id: 'closing-report', label: 'Shift Closing Report', desc: 'Shift closure summary' },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tankId, setTankId] = useState<number | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<unknown[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingTanks, setLoadingTanks] = useState(false);

  const loadTanks = async () => {
    if (tanks.length > 0) return;
    setLoadingTanks(true);
    try {
      setTanks(await api.listTanks());
    } catch {}
    setLoadingTanks(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setMsg(null);
    setResultData(null);
    try {
      switch (selectedReport) {
        case 'daily-dip': {
          const data = await api.listDipRecords({
            date_from: dateFrom || undefined,
            date_to: dateTo || dateFrom || undefined,
            limit: 500,
          });
          setResultData(data);
          break;
        }
        case 'shift-summary': {
          const data = await api.getShiftClosingHistory();
          setResultData(data);
          break;
        }
        case 'tank-wise': {
          if (!tankId) { setMsg('Please select a tank'); break; }
          const data = await api.listDipRecords({ tank_id: tankId, limit: 500 });
          setResultData(data);
          break;
        }
        case 'exception-report': {
          const data = await api.listExceptions({ limit: 500 });
          setResultData(data);
          break;
        }
        case 'audit-trail': {
          const data = await api.getAuditLogs({
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            limit: 500,
          });
          setResultData(data);
          break;
        }
        case 'closing-report': {
          const data = await api.getShiftClosingHistory();
          setResultData(data.filter((sc: any) => sc.status === 'closed'));
          break;
        }
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!resultData || resultData.length === 0) return;
    const headers = Object.keys(resultData[0] as Record<string, unknown>);
    const rows = resultData.map((row) =>
      headers.map((h) => {
        const val = (row as Record<string, unknown>)[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col" id="report-page">
      <h2 className="text-xl font-bold text-dragon-text">Reports</h2>

      {selectedReport && (
        <>
          <div className="report-title hidden">
            {reports.find((r) => r.id === selectedReport)?.label ?? 'Report'}
          </div>
          <div className="report-meta hidden">
            Generated: {new Date().toLocaleString()}
            {dateFrom && ` | From: ${dateFrom}`}
            {dateTo && ` | To: ${dateTo}`}
            {tankId && ` | Tank ID: ${tankId}`}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setSelectedReport(r.id === selectedReport ? null : r.id);
              setResultData(null);
              setMsg(null);
              if (r.id === 'tank-wise') loadTanks();
            }}
            className={`text-left p-3 rounded border transition-colors ${
              selectedReport === r.id
                ? 'border-dragon-primary glass-panel'
                : 'glass-card hover:border-dragon-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-dragon-text-muted" />
              <span className="text-sm font-medium text-dragon-text">{r.label}</span>
            </div>
            <p className="text-xs text-dragon-text-muted">{r.desc}</p>
          </button>
        ))}
      </div>

      {selectedReport && (
        <div className="glass-panel p-4">
          <h3 className="text-lg font-bold text-dragon-text mb-3">Report Parameters</h3>
          <div className="flex gap-3 items-end flex-wrap">
            {(selectedReport === 'daily-dip' || selectedReport === 'audit-trail') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-dragon-text-secondary mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dragon-text-secondary mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="input-field"
                  />
                </div>
              </>
            )}
            {selectedReport === 'tank-wise' && (
              <div>
                <label className="block text-xs font-medium text-dragon-text-secondary mb-1">Tank</label>
                <select
                  value={tankId ?? ''}
                  onChange={(e) => setTankId(e.target.value ? Number(e.target.value) : null)}
                  className="input-field"
                  disabled={loadingTanks}
                >
                  <option value="">Select tank...</option>
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id}>{t.tank_no} - {t.current_product || t.normal_product}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn btn-primary flex items-center gap-1"
            >
              {loading ? 'Generating...' : (
                <>
                  <Download size={14} />
                  Generate Report
                </>
              )}
            </button>
            {resultData && resultData.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="btn btn-primary flex items-center gap-1"
              >
                <Download size={14} />
                Export CSV
              </button>
            )}
          </div>
        </div>
      )}

      {msg && (
        <div className="notice-banner warning">
          {msg}
        </div>
      )}

      {resultData && resultData.length > 0 && (
        <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
          <table className="data-table w-full text-xs">
            <thead className="sticky top-0">
              <tr>
                {Object.keys(resultData[0] as Record<string, unknown>).slice(0, 12).map((key) => (
                  <th key={key} className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary whitespace-nowrap">
                    {key.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultData.map((row, idx) => (
                <tr key={idx} className="border-b border-dragon-border hover:bg-dragon-bg">
                  {Object.values(row as Record<string, unknown>).slice(0, 12).map((val, vi) => (
                    <td key={vi} className="px-2 py-1 text-dragon-text-secondary whitespace-nowrap">
                      {val === null || val === undefined ? '--' : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultData && resultData.length === 0 && (
        <div className="empty-state py-8">
          <span className="empty-state-text">No data found for this report</span>
        </div>
      )}
    </div>
  );
}
