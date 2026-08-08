import { useState } from 'react';
import { useToastStore, type Toast } from '../store/toastStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const Icon = iconMap[toast.type];

  const handleRemove = () => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 250);
  };

  return (
    <div className={`toast-item ${toast.type} ${exiting ? 'exiting' : ''}`}>
      <Icon size={16} />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={handleRemove}
        className="text-dragon-text-muted hover:text-dragon-text transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
