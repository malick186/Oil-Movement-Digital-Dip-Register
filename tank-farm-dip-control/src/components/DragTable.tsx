import { useState, useCallback, useRef, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  label: string;
  width?: string;
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  columns: ColumnDef<T>[];
  data: T[];
  storageKey: string;
  rowKey: (row: T, index: number) => string | number;
}

function loadColumnOrder(key: string, cols: ColumnDef<any>[]): ColumnDef<any>[] {
  try {
    const saved = localStorage.getItem(`col-order-${key}`);
    if (!saved) return cols;
    const order: string[] = JSON.parse(saved);
    const map = new Map(cols.map((c) => [c.key, c]));
    const reordered = order.map((k) => map.get(k)).filter(Boolean) as ColumnDef<any>[];
    for (const col of cols) {
      if (!reordered.find((c) => c.key === col.key)) reordered.push(col);
    }
    return reordered;
  } catch {
    return cols;
  }
}

export default function DragTable<T extends Record<string, any>>({ columns: initialColumns, data, storageKey, rowKey }: Props<T>) {
  const [columns, setColumns] = useState<ColumnDef<T>[]>(() => loadColumnOrder(storageKey, initialColumns));
  const dragCol = useRef<string | null>(null);
  const dragOverCol = useRef<string | null>(null);

  const handleDragStart = useCallback((colKey: string) => {
    dragCol.current = colKey;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    dragOverCol.current = colKey;
  }, []);

  const handleDrop = useCallback((colKey: string) => {
    const from = dragCol.current;
    const to = colKey;
    dragCol.current = null;
    dragOverCol.current = null;
    if (!from || from === to) return;

    setColumns((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((c) => c.key === from);
      const toIdx = next.findIndex((c) => c.key === to);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const order = next.map((c) => c.key);
      try { localStorage.setItem(`col-order-${storageKey}`, JSON.stringify(order)); } catch {}
      return next;
    });
  }, [storageKey]);

  return (
    <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
      <table className="data-table w-full text-xs">
        <thead className="sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                draggable
                onDragStart={() => handleDragStart(col.key)}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDrop={() => handleDrop(col.key)}
                className={`text-left px-2 py-1.5 font-medium text-dragon-text-secondary whitespace-nowrap cursor-grab active:cursor-grabbing select-none transition-colors ${
                  dragOverCol.current === col.key ? 'bg-dragon-primary/10' : ''
                }`}
                style={col.width ? { width: col.width } : undefined}
              >
                <span className="flex items-center gap-1">
                  <GripVertical size={10} className="text-dragon-text-muted shrink-0" />
                  {col.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8">
                <div className="empty-state">
                  <span className="empty-state-text">No data available</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={rowKey(row, idx)} className="border-b border-dragon-border hover:bg-dragon-bg">
                {columns.map((col) => (
                  <td key={col.key} className="px-2 py-1 text-dragon-text-secondary whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key] != null ? String(row[col.key]) : '--'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
