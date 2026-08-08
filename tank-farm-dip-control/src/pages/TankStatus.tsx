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
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Tank Status Overview</h2>

      {dashboardStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Dips Completed" value={dashboardStats.dips_completed} icon={<CheckCircle size={16} />} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Dips Pending" value={dashboardStats.dips_pending} icon={<Activity size={16} />} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Rechecks" value={dashboardStats.recheck_required} icon={<AlertTriangle size={16} />} color="text-orange-600" bg="bg-orange-50" />
          <StatCard label="Abnormal" value={dashboardStats.abnormal_diff} icon={<XCircle size={16} />} color="text-red-600" bg="bg-red-50" />
        </div>
      )}

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Tank</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Product</th>
              <th className="text-right px-3 py-2 font-medium text-slate-600">Gross Dip</th>
              <th className="text-right px-3 py-2 font-medium text-slate-600">G-A Diff</th>
              <th className="text-right px-3 py-2 font-medium text-slate-600">G-R Diff</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Severity</th>
            </tr>
          </thead>
          <tbody>
            {attentionItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  No attention items
                </td>
              </tr>
            ) : (
              attentionItems.map((item) => {
                  const sev = getSeverity(item, 5);
                  return (
                <tr
                  key={item.dip_id}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedTankId(item.dip_id)}
                >
                  <td className="px-3 py-2 font-medium text-slate-700">{item.tank_no}</td>
                  <td className="px-3 py-2 text-slate-500">{item.product_name}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">{item.gross_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">{item.gross_auto_difference?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">{item.gross_radar_difference?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      sev === 'recheck' ? 'bg-red-100 text-red-700' :
                      sev === 'attention' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
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

function StatCard({ label, value, icon, color, bg }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded border border-slate-200 p-3`}>
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-700 mt-1">{value}</div>
    </div>
  );
}
