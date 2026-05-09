import React from "react";
import styles from "./nav.module.css";

const ROUTES: Array<{ hash: string; label: string; icon: string }> = [
  { hash: "", label: "Overview", icon: "\u2302" },
  { hash: "execution-plans", label: "Execution Plans", icon: "\u2192" },
  { hash: "receipts", label: "Receipts", icon: "\u2713" },
  { hash: "replay-validation", label: "Replay Validation", icon: "\u21bb" },
  { hash: "degraded-states", label: "Degraded States", icon: "\u26a0" },
  { hash: "trust-attestation", label: "Trust & Attestation", icon: "\u26a1" },
  { hash: "routing-decisions", label: "Routing Decisions", icon: "\u21c4" },
  { hash: "events", label: "Events", icon: "\u25c6" },
  { hash: "diagnostics", label: "Diagnostics", icon: "\u2699" },
  { hash: "telemetry", label: "Telemetry", icon: "\u25a0" },
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
                <span className={styles.icon} aria-hidden="true">{route.icon}</span>
                {route.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
