import React from "react";
import styles from "./nav.module.css";

const ROUTES: Array<{ hash: string; label: string }> = [
  { hash: "", label: "Overview" },
  { hash: "execution-plans", label: "Execution Plans" },
  { hash: "receipts", label: "Receipts" },
  { hash: "replay-validation", label: "Replay Validation" },
  { hash: "degraded-states", label: "Degraded States" },
  { hash: "trust-attestation", label: "Trust & Attestation" },
  { hash: "routing-decisions", label: "Routing Decisions" },
  { hash: "events", label: "Events" },
  { hash: "diagnostics", label: "Diagnostics" },
  { hash: "telemetry", label: "Telemetry" },
];

export interface NavProps {
  currentHash: string;
  onNavigate: (hash: string) => void;
}

export function Nav({ currentHash, onNavigate }: NavProps) {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <ul className={styles.list}>
        {ROUTES.map((route) => {
          const active = currentHash === route.hash;
          return (
            <li key={route.hash} className={styles.item}>
              <button
                className={active ? `${styles.link} ${styles.active}` : styles.link}
                onClick={() => onNavigate(route.hash)}
                aria-current={active ? "page" : undefined}
                type="button"
              >
                {route.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
