import React from "react";
import { CodeBlock } from "../primitives/code-block";
import styles from "./diagnostics-summary.module.css";

export interface DiagnosticsSummaryProps {
  lines: string[];
  title?: string;
}

export function DiagnosticsSummaryPanel({ lines, title }: DiagnosticsSummaryProps) {
  const content = lines.length > 0 ? lines.join("\n") : "No diagnostics available.";
  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <CodeBlock code={content} title={title ?? "Diagnostics Summary"} />
    </div>
  );
}
