import type { ReactNode } from 'react';

export interface EntryColumn {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  /** width variant: num | s | m | l | date (defaults to 's') */
  width?: 'num' | 's' | 'm' | 'l' | 'date';
}

/**
 * Single-line entry form (U-5 / U-7): one straight line where the field names
 * are column headings and the inputs sit directly below them. Wide forms scroll
 * horizontally instead of wrapping.
 */
export default function EntryLine({ columns }: { columns: EntryColumn[] }) {
  return (
    <div className="entry-line-wrap">
      <table className="entry-line">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={c.width ? `entry-col-${c.width}` : 'entry-col-s'}>
                {c.label}
                {c.required && <span className="text-dragon-danger"> *</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((c, i) => (
              <td key={i}>
                {c.children}
                {c.error && <p className="field-error">{c.error}</p>}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
