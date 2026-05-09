import React from "react";
import styles from "./key-value-table.module.css";

export interface KVEntry {
  key: string;
  value: React.ReactNode;
}

export interface KVTableProps {
  entries: KVEntry[];
  title?: string;
}

export function KVTable({ entries, title }: KVTableProps) {
  return (
    <div className={styles.container}>
      {title && <h4 className={styles.title}>{title}</h4>}
      <dl className={styles.list}>
        {entries.map((entry, idx) => (
          <div key={idx} className={styles.row}>
            <dt className={styles.key}>{entry.key}</dt>
            <dd className={styles.value}>{entry.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
