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
    return <div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div>;
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold text-dragon-text mb-4">Settings</h2>

      {msg && <div className="notice-banner info mb-3">{msg}</div>}

      <div className="glass-card p-4 mb-4">
        <h3 className="text-lg font-semibold text-dragon-text mb-3">Tolerance Settings</h3>
        <div className="overflow-auto">
          <table className="data-table w-full text-[11px]">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Location</th>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Type</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Normal Limit</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Attention Limit</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Recheck Limit</th>
              </tr>
            </thead>
            <tbody>
              {tolerances.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-dragon-text-muted">No tolerances configured</td></tr>
              ) : (
                tolerances.map((t) => (
                  <tr key={t.id}>
                    <td className="px-2 py-1 text-dragon-text-secondary">{t.location || 'Global'}</td>
                    <td className="px-2 py-1 text-dragon-text-secondary">{t.comparison_type}</td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={t.normal_limit}
                        onBlur={(e) => handleUpdateTolerance(t.id, 'normal_limit', Number(e.target.value))}
                        className="input-field w-20 text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={t.attention_limit}
                        onBlur={(e) => handleUpdateTolerance(t.id, 'attention_limit', Number(e.target.value))}
                        className="input-field w-20 text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={t.recheck_limit}
                        onBlur={(e) => handleUpdateTolerance(t.id, 'recheck_limit', Number(e.target.value))}
                        className="input-field w-20 text-right"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-4 mb-4">
        <h3 className="text-lg font-semibold text-dragon-text mb-3">Application Settings</h3>
        <div className="space-y-2">
          {Object.entries(appSettings).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-dragon-text-secondary w-40 truncate">{key}</span>
              <span className="text-xs text-dragon-text font-mono">{value}</span>
            </div>
          ))}
          {Object.keys(appSettings).length === 0 && (
            <span className="text-xs text-dragon-text-muted">No application settings found</span>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold text-dragon-text mb-3">Data Management</h3>
        <button
          onClick={handleSeedData}
          className="btn btn-primary"
        >
          Seed Sample Data
        </button>
      </div>
    </div>
  );
}
