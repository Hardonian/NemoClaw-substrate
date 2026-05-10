import { describe, expect, it } from "vitest";
import { isValidName, VALID_NAME_REGEX, getNameValidationGuidance } from "./name-validation";

describe("name-validation", () => {
  describe("isValidName", () => {
    it("should allow valid names", () => {
      expect(isValidName("my-app")).toBe(true);
      expect(isValidName("app1")).toBe(true);
      expect(isValidName("1app")).toBe(true);
      expect(isValidName("a-b-c")).toBe(true);
      expect(isValidName("a")).toBe(true);
      expect(isValidName("1")).toBe(true);
    });

    it("should reject names containing uppercase letters", () => {
      expect(isValidName("my-App")).toBe(false);
      expect(isValidName("App1")).toBe(false);
      expect(isValidName("MYAPP")).toBe(false);
    });

    it("should reject names with spaces", () => {
      expect(isValidName("my app")).toBe(false);
      expect(isValidName(" app")).toBe(false);
      expect(isValidName("app ")).toBe(false);
    });

    it("should reject names with invalid characters", () => {
      expect(isValidName("app_1")).toBe(false);
      expect(isValidName("app@1")).toBe(false);
      expect(isValidName("app.1")).toBe(false);
      expect(isValidName("app/1")).toBe(false);
    });

    it("should reject names starting or ending with a hyphen", () => {
      expect(isValidName("-app")).toBe(false);
      expect(isValidName("app-")).toBe(false);
      expect(isValidName("-app-")).toBe(false);
    });

    it("should reject empty names", () => {
      expect(isValidName("")).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(isValidName(undefined)).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(isValidName(null)).toBe(false);
    });

    it("should reject names longer than 63 characters", () => {
      const longName = "a".repeat(64);
      expect(isValidName(longName)).toBe(false);
    });

    it("should allow names exactly 63 characters long", () => {
      const longName = "a".repeat(63);
      expect(isValidName(longName)).toBe(true);
    });
  });

  describe("VALID_NAME_REGEX", () => {
    it("matches valid names", () => {
      expect(VALID_NAME_REGEX.test("my-app")).toBe(true);
      expect(VALID_NAME_REGEX.test("app1")).toBe(true);
    });
  });

  describe("getNameValidationGuidance", () => {
    it("provides guidance for spaces", () => {
      const guidance = getNameValidationGuidance("sandbox name", "my app");
      expect(guidance).toContain("Sandbox names cannot contain spaces.");
    });

    it("provides generic guidance for unknown labels", () => {
      const guidance = getNameValidationGuidance("random thing", "my app");
      expect(guidance).toContain("Names cannot contain spaces.");
    });

    it("includes allowed format by default", () => {
      const guidance = getNameValidationGuidance("sandbox name", "my app");
      expect(guidance.some(line => line.includes("Allowed format:"))).toBe(true);
    });

    it("can exclude allowed format", () => {
      const guidance = getNameValidationGuidance("sandbox name", "my app", { includeAllowedFormat: false });
      expect(guidance.some(line => line.includes("Allowed format:"))).toBe(false);
    });
  });
});
