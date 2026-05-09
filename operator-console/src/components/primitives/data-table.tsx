import React from "react";
import styles from "./data-table.module.css";

export interface ColumnDef {
  key: string;
  header: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface DataTableProps {
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  caption?: string;
}

export function DataTable({ columns, rows, caption }: DataTableProps) {
  if (columns.length === 0) {
    return <p className={styles.empty}>No columns defined.</p>;
  }

  if (rows.length === 0) {
    return <p className={styles.empty}>No rows available.</p>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table} role="table">
        {caption && <caption className={styles.caption}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={styles.headerCell}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? styles.evenRow : styles.oddRow}>
              {columns.map((col) => (
                <td key={col.key} className={styles.cell}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
