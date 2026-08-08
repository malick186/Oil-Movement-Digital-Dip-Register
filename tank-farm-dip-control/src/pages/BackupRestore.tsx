import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Upload, Download } from 'lucide-react';

interface BackupInfo {
  path: string;
  timestamp: string;
  size: number;
}

export default function BackupRestore() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadBackups = async () => {
    try {
      setBackups(await api.getBackupInfo());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBackups(); }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setMsg(null);
    try {
      const result = await api.createBackup();
      setMsg('Backup created: ' + result.path);
      loadBackups();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (path: string) => {
    if (!confirm('Restore backup? This may overwrite current data.')) return;
    try {
      await api.restoreBackup(path);
      setMsg('Backup restored successfully');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Restore failed');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Backup & Restore</h2>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded mb-3">{msg}</div>}

      <div className="bg-white rounded border border-slate-200 p-4 mb-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Create Backup</h3>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          <Download size={14} />
          {creating ? 'Creating...' : 'Create New Backup'}
        </button>
      </div>

      <div className="bg-white rounded border border-slate-200 p-4 flex-1 overflow-auto">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Existing Backups</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : backups.length === 0 ? (
          <div className="text-xs text-slate-400">No backups found</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Timestamp</th>
                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Path</th>
                <th className="text-right px-2 py-1.5 font-medium text-slate-600">Size</th>
                <th className="text-center px-2 py-1.5 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="px-2 py-1 text-slate-600">{b.timestamp}</td>
                  <td className="px-2 py-1 text-slate-500 font-mono text-[10px] truncate max-w-xs">{b.path}</td>
                  <td className="px-2 py-1 text-right text-slate-500">{formatSize(b.size)}</td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => handleRestore(b.path)}
                      className="flex items-center gap-1 mx-auto text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors"
                    >
                      <Upload size={12} /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
