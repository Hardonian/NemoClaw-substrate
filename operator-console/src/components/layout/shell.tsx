import React from "react";
import { Header } from "./header";
import { Nav } from "./nav";
import styles from "./shell.module.css";

export interface ShellProps {
  currentHash: string;
  onNavigate: (hash: string) => void;
  children: React.ReactNode;
}

export function Shell({ currentHash, onNavigate, children }: ShellProps) {
  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        <Nav currentHash={currentHash} onNavigate={onNavigate} />
        <main className={styles.main} role="main" aria-label="Console content">
          {children}
        </main>
      </div>
    </div>
  );
}
