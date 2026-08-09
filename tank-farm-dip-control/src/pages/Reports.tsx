import { useMemo, useState } from 'react';
import * as api from '../services/api';
import type { Tank } from '../types';
import { FileText, Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

type ReportType = 'daily-dip' | 'shift-summary' | 'tank-wise' | 'exception-report' | 'audit-trail' | 'closing-report';

interface ReportDef {
  id: ReportType;
  label: string;
  desc: string;
  administratorOnly?: boolean;
}

const reportDefinitions: ReportDef[] = [
  { id: 'daily-dip', label: 'Daily Dip Report', desc: 'All Dip Records for a selected date' },
  { id: 'shift-summary', label: 'Shift Summary Report', desc: 'Dip summary by Shift' },
  { id: 'tank-wise', label: 'Tank-wise Dip Report', desc: 'Dip Records filtered by Tank' },
  { id: 'exception-report', label: 'Exception Report', desc: 'Open and resolved tolerance exceptions' },
  { id: 'audit-trail', label: 'Audit Trail Report', desc: 'Administrator-only system audit export', administratorOnly: true },
  { id: 'closing-report', label: 'Shift Closing Report', desc: 'Shift closure history' },
];

export default function Reports() {
  const user = useAuthStore((s) => s.user);
  const reports = useMemo(
    () => reportDefinitions.filter((r) => !r.administratorOnly || user?.role === 'Administrator'),
    [user?.role],
  );
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
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to load Tanks');
    } finally {
      setLoadingTanks(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedReport) return;
    if (selectedReport === 'audit-trail' && user?.role !== 'Administrator') {
      setMsg('Audit Trail Report is restricted to Administrators.');
      return;
    }

    setLoading(true);
    setMsg(null);
    setResultData(null);
    try {
      switch (selectedReport) {
        case 'daily-dip': {
          setResultData(await api.listDipRecords({
            date_from: dateFrom || undefined,
            date_to: dateTo || dateFrom || undefined,
            limit: 500,
          }));
          break;
        }
        case 'shift-summary':
        case 'closing-report': {
          const data = await api.getShiftClosingHistory();
          setResultData(selectedReport === 'closing-report' ? data.filter((row) => row.status === 'closed') : data);
          break;
        }
        case 'tank-wise': {
          if (!tankId) {
            setMsg('Please select a Tank.');
            break;
          }
          setResultData(await api.listDipRecords({ tank_id: tankId, limit: 500 }));
          break;
        }
        case 'exception-report': {
          setResultData(await api.listExceptions({ limit: 500 }));
          break;
        }
        case 'audit-trail': {
          setResultData(await api.getAuditLogs({
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            limit: 500,
          }));
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
    if (!resultData?.length || !selectedReport) return;
    const headers = Object.keys(resultData[0] as Record<string, unknown>);
    const rows = resultData.map((row) =>
      headers.map((header) => {
        const value = (row as Record<string, unknown>)[header];
        if (value === null || value === undefined) return '';
        const text = String(value);
        return text.includes(',') || text.includes('"') || text.includes('\n')
          ? `"${text.replace(/"/g, '""')}"`
          : text;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col" id="report-page">
      <div>
        <h2 className="text-xl font-bold text-dragon-text">Reports</h2>
        <p className="text-xs text-dragon-text-muted mt-1">Operational reports use the local SQLite database only.</p>
      </div>

      {selectedReport && (
        <>
          <div className="report-title hidden">{reportDefinitions.find((r) => r.id === selectedReport)?.label ?? 'Report'}</div>
          <div className="report-meta hidden">
            Generated: {new Date().toLocaleString()}
            {dateFrom && ` | From: ${dateFrom}`}
            {dateTo && ` | To: ${dateTo}`}
            {tankId && ` | Tank ID: ${tankId}`}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => {
              setSelectedReport(report.id === selectedReport ? null : report.id);
              setResultData(null);
              setMsg(null);
              if (report.id === 'tank-wise') void loadTanks();
            }}
            className={`text-left p-3 rounded border transition-colors ${selectedReport === report.id ? 'border-dragon-primary glass-panel' : 'glass-card hover:border-dragon-border'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-dragon-text-muted" />
              <span className="text-sm font-medium text-dragon-text">{report.label}</span>
            </div>
            <p className="text-xs text-dragon-text-muted">{report.desc}</p>
          </button>
        ))}
      </div>

      {selectedReport && (
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-dragon-text mb-3">Report Parameters</h3>
          <div className="flex gap-3 items-end flex-wrap">
            {(selectedReport === 'daily-dip' || selectedReport === 'audit-trail') && (
              <>
                <div><label className="block text-xs font-medium text-dragon-text-secondary mb-1">From</label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" /></div>
                <div><label className="block text-xs font-medium text-dragon-text-secondary mb-1">To</label><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" /></div>
              </>
            )}
            {selectedReport === 'tank-wise' && (
              <div>
                <label className="block text-xs font-medium text-dragon-text-secondary mb-1">Tank</label>
                <select value={tankId ?? ''} onChange={(e) => setTankId(e.target.value ? Number(e.target.value) : null)} className="input-field" disabled={loadingTanks}>
                  <option value="">Select Tank...</option>
                  {tanks.map((t) => <option key={t.id} value={t.id}>{t.tank_no} - {t.current_product || t.normal_product}</option>)}
                </select>
              </div>
            )}
            <button onClick={handleGenerate} disabled={loading} className="btn btn-primary flex items-center gap-1">
              <Download size={14} /> {loading ? 'Generating...' : 'Generate Report'}
            </button>
            {resultData && resultData.length > 0 && (
              <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-1"><Download size={14} /> Export CSV</button>
            )}
          </div>
        </div>
      )}

      {msg && <div className="notice-banner warning">{msg}</div>}

      {resultData && resultData.length > 0 && (
        <div className="glass-panel rounded-xl overflow-auto flex-1">
          <table className="data-table w-full text-xs">
            <thead className="sticky top-0">
              <tr>{Object.keys(resultData[0] as Record<string, unknown>).slice(0, 12).map((key) => <th key={key} className="text-left px-2 py-1.5 whitespace-nowrap">{key.replace(/_/g, ' ')}</th>)}</tr>
            </thead>
            <tbody>
              {resultData.map((row, index) => (
                <tr key={index}>
                  {Object.values(row as Record<string, unknown>).slice(0, 12).map((value, valueIndex) => <td key={valueIndex} className="px-2 py-1 text-dragon-text-secondary whitespace-nowrap">{value == null ? '--' : String(value)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultData && resultData.length === 0 && <div className="empty-state py-8"><span className="empty-state-text">No data found for this report</span></div>}
    </div>
  );
}
