import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { BackupInfo } from '../types';
import { Download, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export default function BackupRestore() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const loadBackups = async () => {
    try {
      setBackups(await api.getBackupInfo());
    } catch (err) {
      useToastStore.getState().addToast(err instanceof Error ? err.message : 'Failed to load backups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBackups(); }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const filename = await api.createBackup();
      setMessage(`Backup created: ${filename}`);
      useToastStore.getState().addToast('Database backup created', 'success');
      await loadBackups();
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err || 'Backup failed');
      setMessage(text);
      useToastStore.getState().addToast(text, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!window.confirm(`Restore ${filename}?\n\nThe application will first create a pre-restore safety snapshot, validate the selected backup, and then restore it.`)) return;
    setRestoring(filename);
    setMessage(null);
    try {
      await api.restoreBackup(filename);
      setMessage(`Backup restored successfully: ${filename}. A pre-restore safety snapshot was created automatically.`);
      useToastStore.getState().addToast('Database restored successfully', 'success');
      await loadBackups();
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err || 'Restore failed');
      setMessage(text);
      useToastStore.getState().addToast(text, 'error');
    } finally {
      setRestoring(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div>
        <h2 className="text-xl font-bold text-dragon-text">Backup & Restore</h2>
        <p className="text-xs text-dragon-text-muted mt-1">Local SQLite backups only. Restore validates the backup and creates a safety snapshot before changing the live database.</p>
      </div>

      {message && <div className="notice-banner info">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-dragon-success" />
            <h3 className="text-sm font-bold text-dragon-text">Create Local Backup</h3>
          </div>
          <p className="text-xs text-dragon-text-muted mb-3">Creates a consistent SQLite snapshot in the application's local backup folder.</p>
          <button onClick={handleCreateBackup} disabled={creating || restoring !== null} className="btn btn-primary flex items-center gap-1.5">
            <Download size={14} /> {creating ? 'Creating...' : 'Create Backup Now'}
          </button>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={18} className="text-dragon-primary" />
            <h3 className="text-sm font-bold text-dragon-text">Restore Protection</h3>
          </div>
          <p className="text-xs text-dragon-text-muted">Before restore, the selected database is integrity-checked and the current live database is copied to a timestamped <span className="font-mono">pre_restore_safety</span> backup.</p>
        </div>
      </div>

      <div className="glass-panel p-4 flex-1 overflow-auto">
        <h3 className="text-sm font-bold text-dragon-text mb-3">Existing Backups</h3>
        {loading ? (
          <div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div>
        ) : backups.length === 0 ? (
          <div className="empty-state"><span className="empty-state-text">No backups found</span></div>
        ) : (
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5">Created</th>
                <th className="text-left px-2 py-1.5">Filename</th>
                <th className="text-right px-2 py-1.5">Size</th>
                <th className="text-center px-2 py-1.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.filename}>
                  <td className="px-2 py-1 text-dragon-text">{backup.created_at || '--'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary font-mono">{backup.filename}</td>
                  <td className="px-2 py-1 text-right text-dragon-text-secondary">{formatSize(backup.file_size)}</td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => handleRestore(backup.filename)}
                      disabled={creating || restoring !== null}
                      className="btn btn-sm btn-secondary flex items-center gap-1 mx-auto"
                    >
                      <Upload size={12} /> {restoring === backup.filename ? 'Restoring...' : 'Restore'}
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
