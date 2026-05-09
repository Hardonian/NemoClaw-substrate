import React from "react";
import type { ReplayEnvelope } from "../data/types";
import { ReplayViewer } from "../viewers/replay-viewer";
import { Card } from "../primitives/card";
import styles from "./route-common.module.css";

export interface ReplayValidationRouteProps {
  valid: ReplayEnvelope;
  empty: ReplayEnvelope;
  invalid: ReplayEnvelope;
}

export function ReplayValidationRoute({ valid, empty, invalid }: ReplayValidationRouteProps) {
  return (
    <div className={styles.routeContainer}>
      <h2 className={styles.pageTitle}>Replay Validation</h2>
      <p className={styles.pageSubtitle}>Replay envelope validation and event sequence verification.</p>
      <div className={styles.list}>
        <Card title="Valid Envelope" status="success">
          <ReplayViewer envelope={valid} />
        </Card>
        <Card title="Empty Envelope" status="info">
          <ReplayViewer envelope={empty} />
        </Card>
        <Card title="Invalid Envelope (expected failures)" status="error">
          <ReplayViewer envelope={invalid} />
        </Card>
      </div>
    </div>
  );
}
