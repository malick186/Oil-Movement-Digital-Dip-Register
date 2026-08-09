import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { Product, Tank, ToleranceSetting } from '../types';
import { AlertTriangle, Plus } from 'lucide-react';

const emptyRule = {
  tank_id: '',
  product_id: '',
  location: '',
  comparison_type: 'gross_auto',
  normal_limit: '',
  attention_limit: '',
  recheck_limit: '',
};

export default function Settings() {
  const [tolerances, setTolerances] = useState<ToleranceSetting[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});
  const [newRule, setNewRule] = useState(emptyRule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rules, settings, tankRows, productRows] = await Promise.all([
        api.getTolerances(),
        api.getAppSettings(),
        api.listTanks(),
        api.listProducts(),
      ]);
      setTolerances(rules);
      setAppSettings(settings);
      setTanks(tankRows);
      setProducts(productRows);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err || 'Failed to load Settings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const updateLimit = async (rule: ToleranceSetting, field: 'normal_limit' | 'attention_limit' | 'recheck_limit', value: number) => {
    if (!Number.isFinite(value) || value < 0) {
      setMessage('Tolerance values must be non-negative numbers.');
      return;
    }
    try {
      await api.saveTolerance({ id: rule.id, [field]: value });
      setMessage('Tolerance updated.');
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err || 'Tolerance update failed'));
    }
  };

  const createRule = async () => {
    const normal = Number(newRule.normal_limit);
    const attention = Number(newRule.attention_limit);
    const recheck = Number(newRule.recheck_limit);
    if (![normal, attention, recheck].every(Number.isFinite)) {
      setMessage('Enter Normal, Attention and Recheck limits.');
      return;
    }
    setSaving(true);
    try {
      await api.saveTolerance({
        tank_id: newRule.tank_id ? Number(newRule.tank_id) : null,
        product_id: newRule.product_id ? Number(newRule.product_id) : null,
        location: newRule.location.trim() || null,
        comparison_type: newRule.comparison_type,
        normal_limit: normal,
        attention_limit: attention,
        recheck_limit: recheck,
      });
      setNewRule(emptyRule);
      setMessage('Tolerance rule created.');
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err || 'Failed to create tolerance'));
    } finally {
      setSaving(false);
    }
  };

  const seedReferenceData = async () => {
    try {
      const result = await api.seedSampleData();
      setMessage(result);
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err || 'Reference data setup failed'));
    }
  };

  const scopeLabel = (rule: ToleranceSetting) => {
    const tank = tanks.find((t) => t.id === rule.tank_id)?.tank_no;
    const product = products.find((p) => p.id === rule.product_id)?.name;
    return [tank && `Tank ${tank}`, product && `Product ${product}`, rule.location && `Location ${rule.location}`]
      .filter(Boolean)
      .join(' / ') || 'Global';
  };

  if (loading) {
    return <div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div>;
  }

  return (
    <div className="h-full overflow-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-dragon-text">Settings</h2>
        <p className="text-xs text-dragon-text-muted mt-1">Configure only approved operational tolerances. The application does not assume refinery SOP limits.</p>
      </div>

      {message && <div className="notice-banner info">{message}</div>}

      {tolerances.length === 0 && (
        <div className="notice-banner warning items-start">
          <AlertTriangle size={15} className="mt-0.5 flex-none" />
          No gauging tolerance rules are configured. Dip differences will still be calculated, but automatic Normal / Attention / Recheck exceptions cannot be evaluated until approved limits are entered.
        </div>
      )}

      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus size={16} className="text-dragon-primary" />
          <h3 className="text-sm font-semibold text-dragon-text">Add Gauging Tolerance Rule</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Tank Scope (optional)">
            <select value={newRule.tank_id} onChange={(e) => setNewRule((r) => ({ ...r, tank_id: e.target.value }))} className="input-field">
              <option value="">All Tanks</option>
              {tanks.filter((t) => Boolean(t.active)).map((t) => <option key={t.id} value={t.id}>{t.tank_no}</option>)}
            </select>
          </Field>
          <Field label="Product Scope (optional)">
            <select value={newRule.product_id} onChange={(e) => setNewRule((r) => ({ ...r, product_id: e.target.value }))} className="input-field">
              <option value="">All Products</option>
              {products.filter((p) => Boolean(p.active)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Location Scope (optional)">
            <input value={newRule.location} onChange={(e) => setNewRule((r) => ({ ...r, location: e.target.value }))} className="input-field" placeholder="e.g. Keamari Terminal" />
          </Field>
          <Field label="Comparison">
            <select value={newRule.comparison_type} onChange={(e) => setNewRule((r) => ({ ...r, comparison_type: e.target.value }))} className="input-field">
              <option value="gross_auto">Gross vs Auto</option>
              <option value="gross_radar">Gross vs Radar</option>
              <option value="auto_radar">Auto vs Radar</option>
            </select>
          </Field>
          <Field label="Normal Limit (mm)">
            <input type="number" min="0" step="0.01" value={newRule.normal_limit} onChange={(e) => setNewRule((r) => ({ ...r, normal_limit: e.target.value }))} className="input-field" />
          </Field>
          <Field label="Attention Limit (mm)">
            <input type="number" min="0" step="0.01" value={newRule.attention_limit} onChange={(e) => setNewRule((r) => ({ ...r, attention_limit: e.target.value }))} className="input-field" />
          </Field>
          <Field label="Recheck Limit (mm)">
            <input type="number" min="0" step="0.01" value={newRule.recheck_limit} onChange={(e) => setNewRule((r) => ({ ...r, recheck_limit: e.target.value }))} className="input-field" />
          </Field>
          <div className="flex items-end">
            <button onClick={createRule} disabled={saving} className="btn btn-primary w-full">{saving ? 'Saving...' : 'Add Rule'}</button>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-dragon-text mb-3">Configured Tolerances</h3>
        <div className="overflow-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5">Scope</th>
                <th className="text-left px-2 py-1.5">Comparison</th>
                <th className="text-right px-2 py-1.5">Normal</th>
                <th className="text-right px-2 py-1.5">Attention</th>
                <th className="text-right px-2 py-1.5">Recheck</th>
              </tr>
            </thead>
            <tbody>
              {tolerances.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-5 text-dragon-text-muted">No tolerance rules configured</td></tr>
              ) : tolerances.map((t) => (
                <tr key={t.id}>
                  <td className="px-2 py-1 text-dragon-text-secondary">{scopeLabel(t)}</td>
                  <td className="px-2 py-1 font-mono text-dragon-text-secondary">{t.comparison_type}</td>
                  <td className="px-2 py-1 text-right"><LimitInput value={t.normal_limit} onCommit={(v) => updateLimit(t, 'normal_limit', v)} /></td>
                  <td className="px-2 py-1 text-right"><LimitInput value={t.attention_limit} onCommit={(v) => updateLimit(t, 'attention_limit', v)} /></td>
                  <td className="px-2 py-1 text-right"><LimitInput value={t.recheck_limit} onCommit={(v) => updateLimit(t, 'recheck_limit', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-dragon-text mb-3">Application Settings</h3>
          <div className="space-y-2">
            {Object.entries(appSettings).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-dragon-text-secondary w-44 truncate">{key}</span>
                <span className="text-xs text-dragon-text font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-dragon-text mb-2">Reference Data</h3>
          <p className="text-xs text-dragon-text-muted mb-3">Ensures only default Shift names, Product types and Tank Status values. It does not create users, operators, tanks or tolerance limits.</p>
          <button onClick={seedReferenceData} className="btn btn-secondary">Ensure Default Reference Data</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-dragon-text-secondary mb-1">{label}</label>{children}</div>;
}

function LimitInput({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  return <input type="number" min="0" step="0.01" defaultValue={value} onBlur={(e) => onCommit(Number(e.target.value))} className="input-field w-24 text-right" />;
}
