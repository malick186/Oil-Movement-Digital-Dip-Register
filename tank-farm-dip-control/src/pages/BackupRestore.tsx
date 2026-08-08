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
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <h2 className="text-xl font-bold text-dragon-text">Backup & Restore</h2>

      {msg && <div className="notice-banner info">{msg}</div>}

      <div className="glass-panel p-4">
        <h3 className="text-lg font-bold text-dragon-text mb-3">Create Backup</h3>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="btn btn-primary flex items-center gap-1.5"
        >
          <Download size={14} />
          {creating ? 'Creating...' : 'Create New Backup'}
        </button>
      </div>

      <div className="glass-panel p-4 flex-1 overflow-auto">
        <h3 className="text-lg font-bold text-dragon-text mb-3">Existing Backups</h3>
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Loading...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-text">No backups found</span>
          </div>
        ) : (
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Timestamp</th>
                <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Path</th>
                <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Size</th>
                <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b, idx) => (
                <tr key={idx} className="border-b border-dragon-border">
                  <td className="px-2 py-1 text-dragon-text">{b.timestamp}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary font-mono text-xs truncate max-w-xs">{b.path}</td>
                  <td className="px-2 py-1 text-right text-dragon-text-secondary">{formatSize(b.size)}</td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => handleRestore(b.path)}
                      className="btn btn-sm btn-secondary flex items-center gap-1 mx-auto"
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
