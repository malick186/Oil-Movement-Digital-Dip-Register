import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { Tank } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TankTrends() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTank, setSelectedTank] = useState<number | ''>('');
  const [records, setRecords] = useState<{ date: string; gross: number; auto: number | null; radar: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await api.listActiveTanks();
        setTanks(t);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedTank) {
      setRecords([]);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const data = await api.listDipRecords({
          tank_id: Number(selectedTank),
          limit: 100,
        });
        setRecords(
          data.map((r) => ({
            date: `${r.date} ${r.time || ''}`,
            gross: r.gross_dip_mm,
            auto: r.auto_dip_mm,
            radar: r.radar_dip_mm,
          }))
        );
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTank]);

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Tank Trends</h2>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-xs text-slate-600">Tank:</label>
        <select
          value={selectedTank}
          onChange={(e) => setSelectedTank(e.target.value ? Number(e.target.value) : '')}
          className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Select a tank...</option>
          {tanks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tank_no} - {t.location}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <span className="text-sm text-slate-400">Loading...</span>
        </div>
      ) : !selectedTank ? (
        <div className="flex items-center justify-center flex-1">
          <span className="text-sm text-slate-400">Select a tank to view trends</span>
        </div>
      ) : records.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <span className="text-sm text-slate-400">No data available for this tank</span>
        </div>
      ) : (
        <div className="bg-white rounded border border-slate-200 p-4 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={records} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
              />
              <Line type="monotone" dataKey="gross" stroke="#2563eb" strokeWidth={2} dot={false} name="Gross Dip" />
              <Line type="monotone" dataKey="auto" stroke="#16a34a" strokeWidth={1.5} dot={false} name="Auto Dip" />
              <Line type="monotone" dataKey="radar" stroke="#ea580c" strokeWidth={1.5} dot={false} name="Radar Dip" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
