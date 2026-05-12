// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AsyncLocalStorage } from "node:async_hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CorrelationContext {
  correlationId: string;
  parentSpanId?: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlationId: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// UUID v4 generation (no external dependency)
// ---------------------------------------------------------------------------

function generateUuidV4(): string {
  const hex = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return hex.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0x0f) >> (c === "x" ? 0 : 2);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Async-local storage for propagation
// ---------------------------------------------------------------------------

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a new correlation ID (UUID v4).
 */
export function generateCorrelationId(): string {
  return generateUuidV4();
}

/**
 * Run a callback within a correlation context.
 * All async calls nested inside share the same context.
 */
export async function runWithCorrelation<T>(context: CorrelationContext, fn: () => Promise<T> | T): Promise<T> {
  return correlationStorage.run(context, fn);
}

/**
 * Get the current correlation context from async-local storage.
 * Returns undefined if no context is active.
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

/**
 * Get the current correlation ID, or a fallback if none is active.
 */
export function getCurrentCorrelationId(fallback = "none"): string {
  const ctx = correlationStorage.getStore();
  return ctx?.correlationId ?? fallback;
}

/**
 * Attach a correlation ID to an arbitrary log entry object.
 * Returns a new object; does not mutate the original.
 */
export function attachCorrelation(entry: Record<string, unknown>, correlationId?: string): LogEntry {
  const id = correlationId ?? getCurrentCorrelationId("none");
  return {
    timestamp: new Date().toISOString(),
    level: "info",
    message: "",
    correlationId: id,
    ...entry,
  };
}

/**
 * Create a child context that inherits the correlation ID
 * but records a new parent span reference.
 */
export function createChildContext(parentSpanId: string): CorrelationContext | undefined {
  const parent = correlationStorage.getStore();
  if (!parent) return undefined;
  return { correlationId: parent.correlationId, parentSpanId };
}
