import React from "react";
import { StateLabel } from "./state-label";
import styles from "./timeline.module.css";

export interface TimelineItem {
  timestamp: string;
  label: string;
  status?: string;
  detail?: string;
}

export interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>No timeline events.</p>;
  }

  return (
    <ol className={styles.list} aria-label="Timeline">
      {items.map((item, idx) => (
        <li key={idx} className={styles.item}>
          <div className={styles.marker} aria-hidden="true" />
          <div className={styles.content}>
            <div className={styles.row}>
              <time className={styles.timestamp} dateTime={item.timestamp} title={item.timestamp}>
                {formatTimestamp(item.timestamp)}
              </time>
              {item.status && <StateLabel state={item.status} />}
            </div>
            <div className={styles.label}>{item.label}</div>
            {item.detail && <div className={styles.detail}>{item.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  } catch {
    return iso;
  }
}
