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
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <h2 className="text-xl font-bold text-dragon-text">Tank Trends</h2>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-dragon-text-secondary">Tank:</label>
        <select
          value={selectedTank}
          onChange={(e) => setSelectedTank(e.target.value ? Number(e.target.value) : '')}
          className="input-field"
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
        <div className="loading-state flex-1">
          <div className="loading-spinner" />
          <span>Loading...</span>
        </div>
      ) : !selectedTank ? (
        <div className="empty-state flex-1">
          <span className="empty-state-text">Select a tank to view trends</span>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state flex-1">
          <span className="empty-state-text">No data available for this tank</span>
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-4 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={records} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #334155' }}
              />
              <Line type="monotone" dataKey="gross" stroke="#3b82f6" strokeWidth={2} dot={false} name="Gross Dip" />
              <Line type="monotone" dataKey="auto" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Auto Dip" />
              <Line type="monotone" dataKey="radar" stroke="#f97316" strokeWidth={1.5} dot={false} name="Radar Dip" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
