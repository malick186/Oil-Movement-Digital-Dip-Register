import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import type { Tank } from '../types';
import {
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, ComposedChart,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useToastStore } from '../store/toastStore';

export default function TankTrends() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTank, setSelectedTank] = useState<number | ''>('');
  const [records, setRecords] = useState<{ date: string; gross: number; auto: number | null; radar: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const pendingId = useAppStore.getState().pendingTankId;
    if (pendingId) useAppStore.getState().clearPendingTankId();

    (async () => {
      try {
        const t = await api.listActiveTanks();
        setTanks(t);
        if (pendingId && t.some((tank) => tank.id === pendingId)) {
          setSelectedTank(pendingId);
        }
      } catch {
          useToastStore.getState().addToast('Failed to load tank data', 'error');
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
    setAnimate(false);
    (async () => {
      setLoading(true);
      try {
        const data = await api.listDipRecords({
          tank_id: Number(selectedTank),
          limit: 100,
        });
        const mapped = data.map((r) => ({
          date: `${r.date} ${r.time || ''}`,
          gross: r.gross_dip_mm ?? 0,
          auto: r.auto_dip_mm ?? null,
          radar: r.radar_dip_mm ?? null,
        }));
        setRecords(mapped);
        requestAnimationFrame(() => setAnimate(true));
      } catch {
        setRecords([]);
        useToastStore.getState().addToast('Failed to load dip records', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTank]);

  const gradientId = 'dipGradient';

  const CustomDot = useCallback((props: any) => {
    const { cx, cy, stroke } = props;
    if (cx == null || cy == null) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={stroke}
        stroke="var(--dr-card)"
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 6px ${stroke}66)` }}
      />
    );
  }, []);

  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="glass-card p-3 text-xs"
        style={{ border: '1px solid var(--dr-border)', animation: 'scaleIn 0.15s ease forwards' }}
      >
        <div className="text-dragon-text-muted mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-dragon-text-secondary">{p.name}:</span>
            <span className="text-dragon-text font-semibold">{p.value?.toFixed(1)} mm</span>
          </div>
        ))}
      </div>
    );
  }, []);

  const chartAnim = animate
    ? { isAnimationActive: true, animationBegin: 0, animationDuration: 1800, animationEasing: 'ease-out' as const }
    : { isAnimationActive: false };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dragon-text">Tank Trends</h2>
        {records.length > 0 && (
          <span className="text-xs text-dragon-text-muted">{records.length} records</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-dragon-text-secondary">Tank:</label>
        <select
          value={selectedTank}
          onChange={(e) => setSelectedTank(e.target.value ? Number(e.target.value) : '')}
          className="input-field max-w-xs"
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
          <TrendingUp size={40} className="empty-state-icon" />
          <span className="empty-state-text">Select a tank to view trend data</span>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state flex-1">
          <span className="empty-state-text">No dip records found for this tank</span>
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-4 flex-1">
          <svg width="0" height="0">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--dr-primary)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--dr-primary)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={records} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dr-primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--dr-primary)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="autoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dr-success)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--dr-success)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dr-warning)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--dr-warning)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dr-border)" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--dr-text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--dr-border)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--dr-text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--dr-border)' }} />
              <Tooltip content={CustomTooltip} />
              <Area
                type="monotone"
                dataKey="gross"
                fill="url(#grossGrad)"
                stroke="var(--dr-primary)"
                strokeWidth={2}
                dot={false}
                activeDot={<CustomDot />}
                name="Gross Dip"
                {...chartAnim}
              />
              <Line
                type="monotone"
                dataKey="auto"
                stroke="var(--dr-success)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={<CustomDot />}
                name="Auto Dip"
                {...chartAnim}
              />
              <Line
                type="monotone"
                dataKey="radar"
                stroke="var(--dr-warning)"
                strokeWidth={2}
                strokeDasharray="3 2"
                dot={false}
                activeDot={<CustomDot />}
                name="Radar Dip"
                {...chartAnim}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
