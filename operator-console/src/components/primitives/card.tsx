import React from "react";
import { StatusBadge } from "./status-badge";
import styles from "./card.module.css";

export interface CardProps {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
  status?: "info" | "warning" | "error" | "critical" | "success" | "unknown";
}

export function Card({ title, children, subtitle, status }: CardProps) {
  return (
    <div className={styles.card} role="region" aria-labelledby={`card-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title} id={`card-${title.replace(/\s+/g, "-").toLowerCase()}`}>{title}</h3>
          {status && <StatusBadge status={status} label={status} />}
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
