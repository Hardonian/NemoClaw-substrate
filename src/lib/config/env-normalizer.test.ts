// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  normalizeEnvVars,
  buildConfigFromEnv,
  parseBooleanEnvValue,
  parseNumberEnvValue,
  snakeToCamel,
  filterNemoclawEnvVars,
} from "./env-normalizer.js";

describe("normalizeEnvVars", () => {
  it("strips NEMOCLAW_ prefix and converts to camelCase", () => {
    const env = {
      NEMOCLAW_PROVIDER_KEY: "nvidia",
      NEMOCLAW_MODEL_ID: "llama-3",
    };
    const result = normalizeEnvVars(env);
    expect(result).toEqual([
      { key: "providerKey", originalKey: "NEMOCLAW_PROVIDER_KEY", value: "nvidia" },
      { key: "modelId", originalKey: "NEMOCLAW_MODEL_ID", value: "llama-3" },
    ]);
  });

  it("skips non-prefixed keys", () => {
    const env = {
      PATH: "/usr/bin",
      NEMOCLAW_FOO: "bar",
    };
    const result = normalizeEnvVars(env);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("foo");
  });

  it("skips empty values", () => {
    const env = {
      NEMOCLAW_FOO: "",
      NEMOCLAW_BAR: undefined,
      NEMOCLAW_BAZ: "value",
    };
    const result = normalizeEnvVars(env);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("baz");
  });

  it("excludes specified keys", () => {
    const env = {
      NEMOCLAW_SECRET: "shh",
      NEMOCLAW_PUBLIC: "visible",
    };
    const result = normalizeEnvVars(env, { excludeKeys: ["NEMOCLAW_SECRET"] });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("public");
  });

  it("supports custom prefix", () => {
    const env = {
      CUSTOM_FOO: "bar",
    };
    const result = normalizeEnvVars(env, { prefix: "CUSTOM_" });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("foo");
  });

  it("handles empty env object", () => {
    expect(normalizeEnvVars({})).toEqual([]);
  });
});

describe("buildConfigFromEnv", () => {
  it("builds a config object from normalized entries", () => {
    const entries = [
      { key: "providerKey", originalKey: "NEMOCLAW_PROVIDER_KEY", value: "nvidia" },
      { key: "modelId", originalKey: "NEMOCLAW_MODEL_ID", value: "llama-3" },
    ];
    const result = buildConfigFromEnv(entries);
    expect(result).toEqual({
      providerKey: "nvidia",
      modelId: "llama-3",
    });
  });

  it("later entries override earlier ones with same key", () => {
    const entries = [
      { key: "foo", originalKey: "NEMOCLAW_FOO", value: "first" },
      { key: "foo", originalKey: "NEMOCLAW_FOO2", value: "second" },
    ];
    const result = buildConfigFromEnv(entries);
    expect(result.foo).toBe("second");
  });

  it("returns empty object for empty entries", () => {
    expect(buildConfigFromEnv([])).toEqual({});
  });
});

describe("parseBooleanEnvValue", () => {
  it("parses true values", () => {
    for (const value of ["true", "1", "yes", "on", "True", "YES"]) {
      expect(parseBooleanEnvValue(value)).toBe(true);
    }
  });

  it("parses false values", () => {
    for (const value of ["false", "0", "no", "off", "False", "NO"]) {
      expect(parseBooleanEnvValue(value)).toBe(false);
    }
  });

  it("returns undefined for unrecognized values", () => {
    expect(parseBooleanEnvValue("maybe")).toBeUndefined();
    expect(parseBooleanEnvValue("2")).toBeUndefined();
    expect(parseBooleanEnvValue("")).toBeUndefined();
  });
});

describe("parseNumberEnvValue", () => {
  it("parses valid numbers", () => {
    expect(parseNumberEnvValue("42")).toBe(42);
    expect(parseNumberEnvValue("3.14")).toBe(3.14);
    expect(parseNumberEnvValue("-10")).toBe(-10);
    expect(parseNumberEnvValue("  100  ")).toBe(100);
  });

  it("returns undefined for non-numbers", () => {
    expect(parseNumberEnvValue("abc")).toBeUndefined();
    expect(parseNumberEnvValue("NaN")).toBeUndefined();
    expect(parseNumberEnvValue("Infinity")).toBeUndefined();
    expect(parseNumberEnvValue("")).toBeUndefined();
  });
});

describe("snakeToCamel", () => {
  it("converts single word", () => {
    expect(snakeToCamel("FOO")).toBe("foo");
  });

  it("converts two words", () => {
    expect(snakeToCamel("PROVIDER_KEY")).toBe("providerKey");
  });

  it("converts multiple words", () => {
    expect(snakeToCamel("SOME_LONG_VAR_NAME")).toBe("someLongVarName");
  });

  it("handles already lowercase input", () => {
    expect(snakeToCamel("already_lower")).toBe("alreadyLower");
  });
});

describe("filterNemoclawEnvVars", () => {
  it("returns only prefixed keys", () => {
    const env = {
      NEMOCLAW_FOO: "a",
      PATH: "/bin",
      HOME: "/home",
    };
    const result = filterNemoclawEnvVars(env);
    expect(result).toEqual({ NEMOCLAW_FOO: "a" });
  });

  it("skips empty values", () => {
    const env = {
      NEMOCLAW_EMPTY: "",
      NEMOCLAW_UNDEF: undefined,
      NEMOCLAW_SET: "value",
    };
    const result = filterNemoclawEnvVars(env);
    expect(result).toEqual({ NEMOCLAW_SET: "value" });
  });

  it("supports custom prefix", () => {
    const env = {
      PREFIX_A: "1",
      NEMOCLAW_B: "2",
    };
    const result = filterNemoclawEnvVars(env, "PREFIX_");
    expect(result).toEqual({ PREFIX_A: "1" });
  });
});
