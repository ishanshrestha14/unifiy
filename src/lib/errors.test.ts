import { describe, it, expect } from "vitest";
import {
  AppError,
  AuthError,
  NetworkError,
  ValidationError,
  StorageError,
  isAppError,
} from "./errors";
import { getErrorMessage } from "../types";

describe("custom error classes", () => {
  it("AppError carries a message and defaults its code", () => {
    const err = new AppError("boom");
    expect(err.message).toBe("boom");
    expect(err.code).toBe("APP_ERROR");
    expect(err.name).toBe("AppError");
  });

  it.each([
    [new AuthError("bad creds"), AuthError, "AuthError", "AUTH_ERROR"],
    [new NetworkError(), NetworkError, "NetworkError", "NETWORK_ERROR"],
    [new ValidationError("bad"), ValidationError, "ValidationError", "VALIDATION_ERROR"],
    [new StorageError(), StorageError, "StorageError", "STORAGE_ERROR"],
  ])("%s keeps its prototype chain, name and default code", (err, Ctor, name, code) => {
    expect(err).toBeInstanceOf(Ctor);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe(name);
    expect(err.code).toBe(code);
  });

  it("NetworkError and StorageError provide default messages", () => {
    expect(new NetworkError().message).toMatch(/network error/i);
    expect(new StorageError().message).toMatch(/failed to save/i);
  });

  it("ValidationError records the offending field", () => {
    expect(new ValidationError("Required", "email").field).toBe("email");
  });

  it("accepts a custom code", () => {
    expect(new AuthError("expired", "SESSION_EXPIRED").code).toBe("SESSION_EXPIRED");
  });
});

describe("isAppError", () => {
  it("is true for AppError and subclasses", () => {
    expect(isAppError(new AppError("x"))).toBe(true);
    expect(isAppError(new NetworkError())).toBe(true);
  });

  it("is false for plain errors and non-errors", () => {
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError("x")).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("reads the message off Error instances", () => {
    expect(getErrorMessage(new Error("kaput"))).toBe("kaput");
  });

  it("passes strings through", () => {
    expect(getErrorMessage("plain string")).toBe("plain string");
  });

  it("falls back for unknown values", () => {
    expect(getErrorMessage({ foo: 1 })).toBe("An unknown error occurred");
    expect(getErrorMessage(undefined)).toBe("An unknown error occurred");
  });
});
