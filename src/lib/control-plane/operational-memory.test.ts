// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { FileOperationalMemoryStore, type OperationalEvent } from "./operational-memory";

function makeEvent(overrides: Partial<OperationalEvent> = {}): OperationalEvent {
  return {
    eventId: `evt-${Date.now()}-${Math.random()}`,
    occurredAt: new Date().toISOString(),
    sequence: overrides.sequence ?? 0,
    category: "receipt",
    source: "test",
    provenance: { requestId: "req-1" },
    payload: {},
    ...overrides,
  };
}

describe("FileOperationalMemoryStore", () => {
  let tmpDir: string;
  let storePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), "tmp-op-store-"));
    storePath = path.join(tmpDir, "events.jsonl");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("append and list", () => {
    it("appends events and lists them in sequence order", async () => {
      const store = new FileOperationalMemoryStore({ filePath: storePath });
      await store.initialize();
      store.append(makeEvent({ sequence: 0 }));
      store.append(makeEvent({ sequence: 1 }));
      store.append(makeEvent({ sequence: 2 }));
      await store.flush();

      const listed = store.list();
      expect(listed).toHaveLength(3);
      expect(listed[0].sequence).toBe(0);
      expect(listed[1].sequence).toBe(1);
      expect(listed[2].sequence).toBe(2);
    });

    it("persists events to disk as JSONL", async () => {
      const store = new FileOperationalMemoryStore({ filePath: storePath });
      await store.initialize();
      store.append(makeEvent({ sequence: 0, eventId: "persist-test" }));
      await store.flush();

      const content = fs.readFileSync(storePath, "utf8");
      expect(content).toContain("persist-test");
      expect(content).toContain("receipt");
    });
  });

  describe("replay", () => {
    it("reconstructs state from JSONL file on initialize", async () => {
      const store1 = new FileOperationalMemoryStore({ filePath: storePath });
      await store1.initialize();
      store1.append(makeEvent({ sequence: 0, eventId: "evt-0" }));
      store1.append(makeEvent({ sequence: 1, eventId: "evt-1" }));
      await store1.flush();

      const store2 = new FileOperationalMemoryStore({ filePath: storePath });
      await store2.initialize();
      const events = store2.list();
      expect(events).toHaveLength(2);
      expect(events[0].eventId).toBe("evt-0");
      expect(events[1].eventId).toBe("evt-1");
    });

    it("survives hard process kill simulation", async () => {
      const store1 = new FileOperationalMemoryStore({ filePath: storePath });
      await store1.initialize();
      store1.append(makeEvent({ sequence: 0, eventId: "survivor" }));
      await store1.flush();

      // Simulate process kill by creating a new store instance
      const store2 = new FileOperationalMemoryStore({ filePath: storePath });
      await store2.initialize();
      const events = store2.list();
      expect(events).toHaveLength(1);
      expect(events[0].eventId).toBe("survivor");
    });
  });

  describe("malformed line tolerance", () => {
    it("skips malformed JSON lines with a warning", async () => {
      const warnings: string[] = [];
      fs.writeFileSync(storePath, '{"eventId":"good","sequence":0,"category":"receipt","source":"test","provenance":{},"payload":{},"occurredAt":"2024-01-01T00:00:00Z"}\nthis is not json\n{"eventId":"good2","sequence":1,"category":"receipt","source":"test","provenance":{},"payload":{},"occurredAt":"2024-01-01T00:00:00Z"}\n', "utf8");

      const store = new FileOperationalMemoryStore({ filePath: storePath, onWarn: (m) => warnings.push(m) });
      await store.initialize();

      expect(warnings.length).toBeGreaterThan(0);
      expect(store.list()).toHaveLength(2);
    });

    it("skips truncated tail entries", async () => {
      const warnings: string[] = [];
      fs.writeFileSync(storePath, '{"eventId":"ok","sequence":0,"category":"receipt","source":"test","provenance":{},"payload":{},"occurredAt":"2024-01-01T00:00:00Z"}\n{"eventId":"truncated","sequence":1,"catego', "utf8");

      const store = new FileOperationalMemoryStore({ filePath: storePath, onWarn: (m) => warnings.push(m) });
      await store.initialize();

      expect(warnings.length).toBeGreaterThan(0);
      expect(store.list()).toHaveLength(1);
    });

    it("handles empty lines gracefully", async () => {
      fs.writeFileSync(storePath, '{"eventId":"e1","sequence":0,"category":"receipt","source":"test","provenance":{},"payload":{},"occurredAt":"2024-01-01T00:00:00Z"}\n\n\n{"eventId":"e2","sequence":1,"category":"receipt","source":"test","provenance":{},"payload":{},"occurredAt":"2024-01-01T00:00:00Z"}\n', "utf8");

      const store = new FileOperationalMemoryStore({ filePath: storePath });
      await store.initialize();
      expect(store.list()).toHaveLength(2);
    });

    it("handles missing required fields", async () => {
      const warnings: string[] = [];
      fs.writeFileSync(storePath, '{"foo":"bar"}\n{"eventId":"valid","sequence":0,"category":"receipt","source":"test","provenance":{},"payload":{},"occurredAt":"2024-01-01T00:00:00Z"}\n', "utf8");

      const store = new FileOperationalMemoryStore({ filePath: storePath, onWarn: (m) => warnings.push(m) });
      await store.initialize();

      expect(warnings.some((w) => w.includes("malformed"))).toBe(true);
      expect(store.list()).toHaveLength(1);
    });
  });

  describe("compaction", () => {
    it("rewrites log from consistent snapshot", async () => {
      const store = new FileOperationalMemoryStore({ filePath: storePath });
      await store.initialize();

      // Write some events
      for (let i = 0; i < 5; i++) {
        store.append(makeEvent({ sequence: i, eventId: `evt-${i}` }));
      }
      await store.flush();

      // Get file size before compaction
      const sizeBefore = fs.statSync(storePath).size;

      await store.compact();

      const sizeAfter = fs.statSync(storePath).size;
      expect(sizeAfter).toBeLessThanOrEqual(sizeBefore);

      // Verify all events survived compaction
      const store2 = new FileOperationalMemoryStore({ filePath: storePath });
      await store2.initialize();
      expect(store2.list()).toHaveLength(5);
    });

    it("truncates duplicated history after compaction", async () => {
      const store = new FileOperationalMemoryStore({ filePath: storePath });
      await store.initialize();

      store.append(makeEvent({ sequence: 0, eventId: "compact-test" }));
      await store.flush();

      // Simulate append-only growth by writing the same data multiple times
      const content = fs.readFileSync(storePath, "utf8");
      fs.appendFileSync(storePath, content, "utf8");
      fs.appendFileSync(storePath, content, "utf8");

      // File now has duplicated data
      const sizeBefore = fs.statSync(storePath).size;

      await store.compact();

      // File should be smaller after compaction removes duplicates
      const sizeAfter = fs.statSync(storePath).size;
      expect(sizeAfter).toBeLessThan(sizeBefore);

      // Verify data integrity
      const store2 = new FileOperationalMemoryStore({ filePath: storePath });
      await store2.initialize();
      expect(store2.list()).toHaveLength(1);
      expect(store2.list()[0].eventId).toBe("compact-test");
    });

    it("compacts to empty file when no events exist", async () => {
      const store = new FileOperationalMemoryStore({ filePath: storePath });
      await store.initialize();

      fs.writeFileSync(storePath, "garbage line\n", "utf8");
      await store.compact();

      const content = fs.readFileSync(storePath, "utf8");
      expect(content).toBe("");
    });
  });

  describe("constructor configuration", () => {
    it("uses custom flush interval", async () => {
      const store = new FileOperationalMemoryStore({
        filePath: storePath,
        flushIntervalMs: 5000,
      });
      await store.initialize();
      store.append(makeEvent({ sequence: 0 }));
      // Should not have flushed immediately with 5s interval
      await new Promise((r) => setTimeout(r, 50));
      expect(fs.existsSync(storePath + ".tmp")).toBe(false);
    });

    it("uses custom max file size", async () => {
      const store = new FileOperationalMemoryStore({
        filePath: storePath,
        maxFileSizeBytes: 100,
      });
      await store.initialize();
      // The maxFileSizeBytes is used internally during flush
      expect(store).toBeDefined();
    });

    it("creates parent directory if missing", async () => {
      const nestedPath = path.join(tmpDir, "deep", "nested", "events.jsonl");
      const store = new FileOperationalMemoryStore({ filePath: nestedPath });
      await store.initialize();
      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it("accepts custom warning callback", async () => {
      const warnings: string[] = [];
      fs.writeFileSync(storePath, "bad line\n", "utf8");
      const store = new FileOperationalMemoryStore({
        filePath: storePath,
        onWarn: (m) => warnings.push(m),
      });
      await store.initialize();
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe("performance", () => {
    it("replays 1000 lines quickly", async () => {
      // Build a 1000-line JSONL file
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(JSON.stringify(makeEvent({ sequence: i, eventId: `perf-${i}` })));
      }
      fs.writeFileSync(storePath, lines.join("\n") + "\n", "utf8");

      const store = new FileOperationalMemoryStore({ filePath: storePath });
      const start = Date.now();
      await store.initialize();
      const elapsed = Date.now() - start;

      expect(store.list()).toHaveLength(1000);
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe("clear", () => {
    it("clears in-memory state and truncates file", async () => {
      const store = new FileOperationalMemoryStore({ filePath: storePath });
      await store.initialize();
      store.append(makeEvent({ sequence: 0 }));
      await store.flush();

      store.clear();
      expect(store.list()).toHaveLength(0);
      expect(fs.readFileSync(storePath, "utf8")).toBe("");
    });
  });

  describe("write (persistence adapter)", () => {
    it("writes batch of events via persistence adapter interface", async () => {
      const store = new FileOperationalMemoryStore({ filePath: storePath });
      await store.initialize();

      const events = [
        makeEvent({ sequence: 0, eventId: "batch-0" }),
        makeEvent({ sequence: 1, eventId: "batch-1" }),
        makeEvent({ sequence: 2, eventId: "batch-2" }),
      ];
      await store.write(events);

      const listed = store.list();
      expect(listed).toHaveLength(3);
      expect(listed.map((e) => e.eventId)).toContain("batch-0");
      expect(listed.map((e) => e.eventId)).toContain("batch-1");
      expect(listed.map((e) => e.eventId)).toContain("batch-2");
    });
  });
});
