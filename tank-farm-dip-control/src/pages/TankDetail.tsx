import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { Tank, DipRecordWithRelations } from '../types';
import { Cylinder, TrendingUp, History } from 'lucide-react';

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
      } finally {
        setLoading(false);
      }
    })();
  }, [tankId]);

  const loadHistory = async () => {
    try {
      const data = await api.listDipRecords({ tank_id: tankId, limit: 50 });
      setHistory(data);
    } catch {}
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-slate-400">Loading tank details...</span>
      </div>
    );
  }

  if (!tank) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-slate-400">Tank not found</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-xs text-blue-600 hover:text-blue-800">
          Back to Tank Status
        </button>
        <h2 className="text-base font-semibold text-slate-700">
          {tank.tank_no} - {tank.current_product || tank.normal_product || 'Unassigned'}
        </h2>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('info')}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            tab === 'info'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Cylinder size={14} className="inline mr-1" />
          Tank Info
        </button>
        <button
          onClick={() => setTab('history')}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            tab === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History size={14} className="inline mr-1" />
          Dip History
        </button>
        <button
          className="text-xs px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <TrendingUp size={14} className="inline mr-1" />
          Trends
        </button>
      </div>

      {tab === 'info' && (
        <div className="flex-1 overflow-auto space-y-4">
          <div className="bg-white rounded border border-slate-200 p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Master Information</h3>
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
            <div className="bg-white rounded border border-slate-200 p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Latest Observation</h3>
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
            <div className="bg-white rounded border border-slate-200 p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Verification</h3>
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
        <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Record #</th>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Date</th>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Time</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">Gross</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">Auto</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">Radar</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">G-A Diff</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">G-R Diff</th>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Status</th>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Operator</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">No dip records for this tank</td>
                </tr>
              ) : (
                history.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1 font-mono text-slate-700">{r.record_number}</td>
                    <td className="px-2 py-1 text-slate-500">{r.date}</td>
                    <td className="px-2 py-1 text-slate-500">{r.time}</td>
                    <td className="px-2 py-1 text-right font-mono text-slate-700">{r.gross_dip_mm?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1 text-right font-mono text-slate-500">{r.auto_dip_mm?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1 text-right font-mono text-slate-500">{r.radar_dip_mm?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1 text-right font-mono">{r.gross_auto_difference?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1 text-right font-mono">{r.gross_radar_difference?.toFixed(1) ?? '--'}</td>
                    <td className="px-2 py-1">
                      <span className={`px-1 py-0.5 rounded text-[10px] ${
                        r.review_status === 'approved' ? 'bg-green-100 text-green-700' :
                        r.review_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {r.review_status}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-slate-500">{r.operator_name}</td>
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
      <span className="text-slate-400">{label}</span>
      <div className="font-medium text-slate-700 mt-0.5">{value || '--'}</div>
    </div>
  );
}
