import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { Tank, DipRecordWithRelations } from '../types';
import { Cylinder, TrendingUp, History } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useToastStore } from '../store/toastStore';

interface Props {
  tankId: number;
  onBack: () => void;
}

export default function TankDetail({ tankId, onBack }: Props) {
  const [tank, setTank] = useState<Tank | null>(null);
  const [latestDip, setLatestDip] = useState<DipRecordWithRelations | null>(null);
  const [history, setHistory] = useState<DipRecordWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'history'>('info');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tankData, dipData] = await Promise.all([
          api.getTank(tankId),
          api.listDipRecords({ tank_id: tankId, limit: 1 }),
        ]);
        setTank(tankData);
        if (dipData.length > 0) setLatestDip(dipData[0]);
      } catch {
        useToastStore.getState().addToast('Failed to load tank details', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [tankId]);

  const loadHistory = async () => {
    try {
      const data = await api.listDipRecords({ tank_id: tankId, limit: 50 });
      setHistory(data);
    } catch {
      useToastStore.getState().addToast('Failed to load dip history', 'error');
    }
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>Loading tank details...</span>
      </div>
    );
  }

  if (!tank) {
    return (
      <div className="empty-state">
        <span className="empty-state-text">Tank not found</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-xs text-dragon-primary">
          &larr; Back to Tank Status
        </button>
        <h2 className="text-xl font-bold text-dragon-text">
          {tank.tank_no} - {tank.current_product || tank.normal_product || 'Unassigned'}
        </h2>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('info')}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            tab === 'info'
              ? 'btn btn-primary'
              : 'btn btn-secondary'
          }`}
        >
          <Cylinder size={14} className="inline mr-1" />
          Tank Info
        </button>
        <button
          onClick={() => setTab('history')}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            tab === 'history'
              ? 'btn btn-primary'
              : 'btn btn-secondary'
          }`}
        >
          <History size={14} className="inline mr-1" />
          Dip History
        </button>
        <button
          onClick={() => useAppStore.getState().navigateToTankTrends(tankId)}
          className="btn btn-secondary text-xs px-3 py-1.5"
        >
          <TrendingUp size={14} className="inline mr-1" />
          Trends
        </button>
      </div>

      {tab === 'info' && (
        <div className="flex-1 overflow-auto space-y-4">
          <div className="glass-card p-4">
            <h3 className="text-lg font-semibold text-dragon-text mb-3">Master Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
              <Field label="Tank No." value={tank.tank_no} />
              <Field label="Location" value={tank.location} />
              <Field label="Tank Farm" value={tank.tank_farm} />
              <Field label="Product" value={tank.current_product || tank.normal_product} />
              <Field label="Reference Point" value={tank.reference_point} />
              <Field label="Tank Type" value={tank.tank_type} />
              <Field label="Roof Type" value={tank.roof_type} />
              <Field label="Safe Fill Height" value={tank.safe_fill_height?.toString()} />
              <Field label="Min Operating Level" value={tank.min_operating_level?.toString()} />
              <Field label="Radar Available" value={tank.radar_available ? 'Yes' : 'No'} />
              <Field label="Auto Dip Available" value={tank.auto_dip_available ? 'Yes' : 'No'} />
              <Field label="Water Dip Applicable" value={tank.water_dip_applicable ? 'Yes' : 'No'} />
              <Field label="Sludge Dip Applicable" value={tank.sludge_dip_applicable ? 'Yes' : 'No'} />
              <Field label="Working Capacity" value={tank.working_capacity?.toString()} />
            </div>
          </div>

          {latestDip && (
            <div className="glass-card p-4">
              <h3 className="text-lg font-semibold text-dragon-text mb-3">Latest Observation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                <Field label="Date" value={latestDip.date} />
                <Field label="Time" value={latestDip.time} />
                <Field label="Gross Dip" value={`${latestDip.gross_dip_mm?.toFixed(1)} mm`} />
                <Field label="Auto Dip" value={latestDip.auto_dip_mm != null ? `${latestDip.auto_dip_mm.toFixed(1)} mm` : '--'} />
                <Field label="Radar Dip" value={latestDip.radar_dip_mm != null ? `${latestDip.radar_dip_mm.toFixed(1)} mm` : '--'} />
                <Field label="Water Dip" value={`${latestDip.water_dip_mm?.toFixed(1)} mm`} />
                <Field label="Sludge Dip" value={`${latestDip.sludge_dip_mm?.toFixed(1)} mm`} />
                <Field label="Temperature" value={latestDip.temperature != null ? `${latestDip.temperature} ${latestDip.temperature_unit}` : '--'} />
                <Field label="Density" value={latestDip.density?.toFixed(4)} />
                <Field label="Tank Status" value={latestDip.tank_status_name} />
                <Field label="Operator" value={latestDip.operator_name} />
                <Field label="Remarks" value={latestDip.remarks} />
              </div>
            </div>
          )}

          {latestDip && (
            <div className="glass-card p-4">
              <h3 className="text-lg font-semibold text-dragon-text mb-3">Verification</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                <Field label="Gross vs Auto" value={latestDip.gross_auto_difference != null ? `${latestDip.gross_auto_difference.toFixed(1)} mm` : '--'} />
                <Field label="Gross vs Radar" value={latestDip.gross_radar_difference != null ? `${latestDip.gross_radar_difference.toFixed(1)} mm` : '--'} />
                <Field label="Auto vs Radar" value={latestDip.auto_radar_difference != null ? `${latestDip.auto_radar_difference.toFixed(1)} mm` : '--'} />
                <Field label="Review Status" value={latestDip.review_status} />
                <Field label="Approval Status" value={latestDip.approval_status} />
                <Field label="Entered By" value={latestDip.entered_by_name} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Record #</th>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Date</th>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Time</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Gross</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Auto</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Radar</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">G-A Diff</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">G-R Diff</th>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Status</th>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Operator</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-dragon-text-muted">No dip records for this tank</td>
                </tr>
              ) : (
                history.map((r) => (
                  <tr key={r.id}>
                    <td className="px-2 py-1 font-mono text-dragon-text">{r.record_number}</td>
                    <td className="px-2 py-1 text-dragon-text-secondary">{r.date}</td>
                    <td className="px-2 py-1 text-dragon-text-secondary">{r.time}</td>
                    <td className="px-2 py-1 text-right font-mono text-dragon-text">{r.gross_dip_mm?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1 text-right font-mono text-dragon-text-secondary">{r.auto_dip_mm?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1 text-right font-mono text-dragon-text-secondary">{r.radar_dip_mm?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1 text-right font-mono text-dragon-text-secondary">{r.gross_auto_difference?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1 text-right font-mono text-dragon-text-secondary">{r.gross_radar_difference?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1">
                      <span className={`px-1 py-0.5 rounded text-[10px] ${
                        r.review_status === 'approved' ? 'bg-dragon-success/20 text-dragon-success' :
                        r.review_status === 'rejected' ? 'bg-dragon-danger/20 text-dragon-danger' :
                        'bg-dragon-warning/20 text-dragon-warning'
                      }`}>
                        {r.review_status}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-dragon-text-secondary">{r.operator_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-dragon-text-muted">{label}</span>
      <div className="font-medium text-dragon-text mt-0.5">{value || '--'}</div>
    </div>
  );
}
