import React from "react";
import styles from "./empty-state.module.css";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {actionLabel && onAction && (
        <button className={styles.action} onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
