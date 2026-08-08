import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import * as api from '../services/api';
import type { AttentionItem } from '../types';
import TankDetail from './TankDetail';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function getSeverity(item: AttentionItem, maxAttention: number): 'recheck' | 'attention' | 'normal' {
  const ga = Math.abs(item.gross_auto_difference ?? 0);
  const gr = Math.abs(item.gross_radar_difference ?? 0);
  const max = Math.max(ga, gr);
  if (max > 10) return 'recheck';
  if (max > maxAttention) return 'attention';
  return 'normal';
}

export default function TankStatus() {
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const dashboardStats = useAppStore((s) => s.dashboardStats);

  useEffect(() => {
    (async () => {
      try {
        const items = await api.getAttentionList();
        setAttentionItems(items);
      } catch {
        setAttentionItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (selectedTankId !== null) {
    return <TankDetail tankId={selectedTankId} onBack={() => setSelectedTankId(null)} />;
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold text-dragon-text mb-4">Tank Status Overview</h2>

      {dashboardStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Dips Completed" value={dashboardStats.dips_completed} icon={<CheckCircle size={16} />} color="text-dragon-success" />
          <StatCard label="Dips Pending" value={dashboardStats.dips_pending} icon={<Activity size={16} />} color="text-dragon-warning" />
          <StatCard label="Rechecks" value={dashboardStats.recheck_required} icon={<AlertTriangle size={16} />} color="text-dragon-warning" />
          <StatCard label="Abnormal" value={dashboardStats.abnormal_diff} icon={<XCircle size={16} />} color="text-dragon-danger" />
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Tank</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Product</th>
              <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Gross Dip</th>
              <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">G-A Diff</th>
              <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">G-R Diff</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Severity</th>
            </tr>
          </thead>
          <tbody>
            {attentionItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-dragon-text-muted">
                  No attention items
                </td>
              </tr>
            ) : (
              attentionItems.map((item) => {
                  const sev = getSeverity(item, 5);
                  return (
                <tr
                  key={item.dip_id}
                  className="cursor-pointer"
                  onClick={() => setSelectedTankId(item.dip_id)}
                >
                  <td className="px-3 py-2 font-medium text-dragon-text">{item.tank_no}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{item.product_name}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text">{item.gross_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{item.gross_auto_difference?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{item.gross_radar_difference?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      sev === 'recheck' ? 'bg-dragon-danger/20 text-dragon-danger' :
                      sev === 'attention' ? 'bg-dragon-warning/20 text-dragon-warning' :
                      'bg-dragon-primary/20 text-dragon-primary'
                    }`}>
                      {sev}
                    </span>
                  </td>
                </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-dragon-text-secondary">{label}</span>
      </div>
      <div className="text-lg font-bold text-dragon-text mt-1">{value}</div>
    </div>
  );
}
