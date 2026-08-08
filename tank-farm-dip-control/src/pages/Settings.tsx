import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { ToleranceSetting } from '../types';

export default function Settings() {
  const [tolerances, setTolerances] = useState<ToleranceSetting[]>([]);
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, s] = await Promise.all([api.getTolerances(), api.getAppSettings()]);
        setTolerances(t);
        setAppSettings(s);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdateTolerance = async (id: number, field: string, value: number) => {
    if (isNaN(value) || value < 0) {
      setMsg('Please enter a valid non-negative number');
      return;
    }
    try {
      await api.updateTolerance(id, { [field]: value });
      setMsg('Tolerance updated');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleSeedData = async () => {
    try {
      await api.seedSampleData();
      setMsg('Sample data seeded successfully');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Seed failed');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><span className="text-sm text-slate-400">Loading...</span></div>;
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Settings</h2>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded mb-3">{msg}</div>}

      <div className="bg-white rounded border border-slate-200 p-4 mb-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Tolerance Settings</h3>
        <div className="overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Location</th>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Type</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">Normal Limit</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">Attention Limit</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">Recheck Limit</th>
              </tr>
            </thead>
            <tbody>
              {tolerances.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-slate-400">No tolerances configured</td></tr>
              ) : (
                tolerances.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50">
                    <td className="px-2 py-1 text-slate-600">{t.location || 'Global'}</td>
                    <td className="px-2 py-1 text-slate-500">{t.comparison_type}</td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={t.normal_limit}
                        onBlur={(e) => handleUpdateTolerance(t.id, 'normal_limit', Number(e.target.value))}
                        className="w-20 border border-slate-300 rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={t.attention_limit}
                        onBlur={(e) => handleUpdateTolerance(t.id, 'attention_limit', Number(e.target.value))}
                        className="w-20 border border-slate-300 rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={t.recheck_limit}
                        onBlur={(e) => handleUpdateTolerance(t.id, 'recheck_limit', Number(e.target.value))}
                        className="w-20 border border-slate-300 rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:border-blue-500"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 p-4 mb-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Application Settings</h3>
        <div className="space-y-2">
          {Object.entries(appSettings).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-40 truncate">{key}</span>
              <span className="text-xs text-slate-700 font-mono">{value}</span>
            </div>
          ))}
          {Object.keys(appSettings).length === 0 && (
            <span className="text-xs text-slate-400">No application settings found</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Data Management</h3>
        <button
          onClick={handleSeedData}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          Seed Sample Data
        </button>
      </div>
    </div>
  );
}
