// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  generateCorrelationId,
  runWithCorrelation,
  getCorrelationContext,
  getCurrentCorrelationId,
  attachCorrelation,
  createChildContext,
} from "./correlation-id";

describe("generateCorrelationId", () => {
  it("returns a UUID v4 formatted string", () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("returns unique IDs on successive calls", () => {
    const a = generateCorrelationId();
    const b = generateCorrelationId();
    expect(a).not.toBe(b);
  });
});

describe("runWithCorrelation / getCorrelationContext", () => {
  it("sets context within callback", async () => {
    const ctx = await runWithCorrelation(
      { correlationId: "test-123" },
      async () => getCorrelationContext(),
    );
    expect(ctx).toEqual({ correlationId: "test-123" });
  });

  it("returns undefined outside of context", () => {
    expect(getCorrelationContext()).toBeUndefined();
  });

  it("propagates context through nested async calls", async () => {
    const result = await runWithCorrelation(
      { correlationId: "outer" },
      async () => {
        const inner = await runWithCorrelation(
          { correlationId: "inner", parentSpanId: "span-1" },
          async () => getCorrelationContext(),
        );
        return {
          outer: getCorrelationContext(),
          inner,
        };
      },
    );
    expect(result.inner).toEqual({ correlationId: "inner", parentSpanId: "span-1" });
    expect(result.outer).toEqual({ correlationId: "outer" });
  });
});

describe("getCurrentCorrelationId", () => {
  it("returns degraded when no context is active", () => {
    expect(getCurrentCorrelationId("degraded")).toBe("degraded");
  });

  it("returns the correlation ID when context is active", async () => {
    const result = await runWithCorrelation(
      { correlationId: "abc-456" },
      async () => getCurrentCorrelationId(),
    );
    expect(result).toBe("abc-456");
  });
});

describe("attachCorrelation", () => {
  it("attaches correlation ID to a log entry", async () => {
    const entry = await runWithCorrelation(
      { correlationId: "corr-1" },
      async () => attachCorrelation({ message: "hello", level: "error" }),
    );
    expect(entry.correlationId).toBe("corr-1");
    expect(entry.message).toBe("hello");
    expect(entry.level).toBe("error");
    expect(entry.timestamp).toBeDefined();
  });

  it("uses explicit correlation ID when provided", () => {
    const entry = attachCorrelation({ message: "test" }, "explicit-id");
    expect(entry.correlationId).toBe("explicit-id");
  });

  it("does not mutate the original object", () => {
    const original = { message: "hello" };
    attachCorrelation(original, "x");
    expect(original).toEqual({ message: "hello" });
  });
});

describe("createChildContext", () => {
  it("returns undefined when no parent context exists", () => {
    expect(createChildContext("span-1")).toBeUndefined();
  });

  it("inherits correlation ID from parent", async () => {
    const result = await runWithCorrelation(
      { correlationId: "parent-corr" },
      async () => createChildContext("child-span"),
    );
    expect(result).toEqual({ correlationId: "parent-corr", parentSpanId: "child-span" });
  });
});
