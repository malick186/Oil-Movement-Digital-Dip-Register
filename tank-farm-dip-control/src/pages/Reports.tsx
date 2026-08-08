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
          setResultData(data);
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
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
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
        <div className="bg-white rounded border border-slate-200 p-4 mb-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Report Parameters</h3>
          <div className="flex gap-3 items-end flex-wrap">
            {(selectedReport === 'daily-dip' || selectedReport === 'audit-trail') && (
              <>
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
              </>
            )}
            {selectedReport === 'tank-wise' && (
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Tank</label>
                <select
                  value={tankId ?? ''}
                  onChange={(e) => setTankId(e.target.value ? Number(e.target.value) : null)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
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
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs px-3 py-1.5 rounded transition-colors"
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
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>
            )}
          </div>
        </div>
      )}

      {msg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded mb-3">
          {msg}
        </div>
      )}

      {resultData && resultData.length > 0 && (
        <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                {Object.keys(resultData[0] as Record<string, unknown>).slice(0, 12).map((key) => (
                  <th key={key} className="text-left px-2 py-1.5 font-medium text-slate-600 whitespace-nowrap">
                    {key.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultData.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  {Object.values(row as Record<string, unknown>).slice(0, 12).map((val, vi) => (
                    <td key={vi} className="px-2 py-1 text-slate-600 whitespace-nowrap">
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
        <div className="text-xs text-slate-400 text-center py-8">No data found for this report</div>
      )}
    </div>
  );
}
