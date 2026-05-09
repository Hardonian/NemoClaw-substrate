import styles from "./state-label.module.css";

const STATE_COLORS: Record<string, { bg: string; fg: string }> = {
  healthy: { bg: "#dcfce7", fg: "#166534" },
  constrained: { bg: "#dbeafe", fg: "#1e40af" },
  degraded: { bg: "#fef3c7", fg: "#92400e" },
  unavailable: { bg: "#fee2e2", fg: "#991b1b" },
  unknown: { bg: "#f3f4f6", fg: "#4b5563" },
  partial_capability: { bg: "#fef9c3", fg: "#854d0e" },
  approval_blocked: { bg: "#e9d5ff", fg: "#6b21a8" },
  stale: { bg: "#fed7aa", fg: "#9a3412" },
  unreachable: { bg: "#fecaca", fg: "#991b1b" },
};

export interface StateLabelProps {
  state: string;
}

export function StateLabel({ state }: StateLabelProps) {
  const colors = STATE_COLORS[state] ?? { bg: "#f3f4f6", fg: "#4b5563" };
  return (
    <span
      className={styles.label}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
      aria-label={`State: ${state}`}
    >
      {state}
    </span>
  );
}
