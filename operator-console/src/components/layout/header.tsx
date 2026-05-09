import React from "react";
import styles from "./header.module.css";

export function Header() {
  return (
    <header className={styles.header} role="banner">
      <div className={styles.content}>
        <h1 className={styles.title}>NemoClaw Operator Console</h1>
        <span className={styles.readOnlyBadge} role="status" aria-label="Read-only mode">
          Read-Only
        </span>
      </div>
    </header>
  );
}
