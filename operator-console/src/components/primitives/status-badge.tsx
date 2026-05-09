import React from "react";
import styles from "./status-badge.module.css";

export interface StatusBadgeProps {
  status: "info" | "warning" | "error" | "critical" | "success" | "unknown";
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={styles.badge} data-status={status} role="status" aria-label={label}>
      {label}
    </span>
  );
}
