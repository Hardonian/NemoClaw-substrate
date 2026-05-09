import React, { useCallback } from "react";
import styles from "./code-block.module.css";

export interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language, title }: CodeBlockProps) {
  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(code).catch(() => {
      /* clipboard unavailable */
    });
  }, [code]);

  return (
    <div className={styles.container} aria-label="Code block">
      {(title ?? language) && (
        <div className={styles.header}>
          {title && <span className={styles.title}>{title}</span>}
          {language && <span className={styles.language}>{language}</span>}
          <button
            className={styles.copyButton}
            onClick={handleCopy}
            aria-label="Copy code to clipboard"
            type="button"
          >
            Copy
          </button>
        </div>
      )}
      <pre className={styles.code} tabIndex={0} aria-label="Code content">
        <code>{code}</code>
      </pre>
    </div>
  );
}
