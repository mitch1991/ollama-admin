import { afterEach, describe, it, expect, vi } from "vitest";
import {
  buildOllamaUrl,
  formatOllamaConnectionError,
  normalizeOllamaUrl,
  ollamaFetch,
  redactOllamaUrl,
} from "@/lib/ollama";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ollamaFetch", () => {
  it("calls the correct URL and returns JSON", async () => {
    const mockResponse = { version: "0.3.0" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const result = await ollamaFetch("http://localhost:11434", "/api/version");
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/version",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }));

    await expect(
      ollamaFetch("http://localhost:11434", "/api/version")
    ).rejects.toThrow("Ollama API error: 500 Internal Server Error");
  });

  it("strips trailing slash from base URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));

    await ollamaFetch("http://localhost:11434/", "/api/tags");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/tags",
      expect.anything()
    );
  });
});

describe("formatOllamaConnectionError", () => {
  it("explains that localhost points to the container", () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      cause: { code: "ECONNREFUSED" },
    });

    expect(
      formatOllamaConnectionError("http://localhost:11434", error)
    ).toContain("localhost points to the Ollama Admin container");
  });

  it("explains how to map host.docker.internal when DNS fails", () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      cause: { code: "ENOTFOUND" },
    });

    const message = formatOllamaConnectionError(
      "http://host.docker.internal:11434",
      error
    );
    expect(message).toContain("host.docker.internal:host-gateway");
    expect(message).toContain("extra_hosts");
  });

  it("explains how to expose Ollama when the host refuses the connection", () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      cause: {
        errors: [{ code: "ECONNREFUSED" }, { code: "ECONNREFUSED" }],
      },
    });

    expect(
      formatOllamaConnectionError(
        "http://host.docker.internal:11434",
        error
      )
    ).toContain("OLLAMA_HOST=0.0.0.0:11434");
  });

  it("preserves an HTTP error returned by Ollama", () => {
    expect(
      formatOllamaConnectionError(
        "http://host.docker.internal:11434",
        new Error("Ollama API error: 503 Service Unavailable")
      )
    ).toBe("Ollama API error: 503 Service Unavailable");
  });

  it.each([
    "http://[::1]:11434",
    "http://localhost.:11434",
    "http://127.42.0.1:11434",
  ])("recognizes loopback host %s", (url) => {
    expect(
      formatOllamaConnectionError(url, new TypeError("fetch failed"))
    ).toContain("localhost points to the Ollama Admin container");
  });
});

describe("normalizeOllamaUrl", () => {
  it("trims input and removes only the trailing slash", () => {
    expect(normalizeOllamaUrl("  http://ollama.internal:11434/base/  ")).toBe(
      "http://ollama.internal:11434/base"
    );
  });

  it.each([
    ["", "URL is required"],
    [42, "URL is required"],
    ["ftp://ollama.internal", "must use http or https"],
    ["http://alice:secret@ollama.internal", "must not include embedded credentials"],
    ["http://ollama.internal/#fragment", "must not include"],
    ["http://ollama.internal/?target=other", "must not include"],
  ])("rejects invalid value %j", (value, error) => {
    expect(() => normalizeOllamaUrl(value)).toThrow(error as string);
  });
});

describe("redactOllamaUrl", () => {
  it("removes credentials, query strings, and fragments", () => {
    expect(
      redactOllamaUrl(
        "http://alice:secret@ollama.internal:11434/base?token=secret#part"
      )
    ).toBe("http://ollama.internal:11434/base");
  });

  it("does not echo invalid values", () => {
    expect(redactOllamaUrl("secret-not-a-url")).toBe("[invalid Ollama URL]");
  });
});

describe("buildOllamaUrl", () => {
  it("builds an API URL from a validated base", () => {
    expect(buildOllamaUrl("http://ollama.internal:11434/", "/api/version")).toBe(
      "http://ollama.internal:11434/api/version"
    );
  });

  it("rejects a legacy credential-bearing base before fetch", () => {
    expect(() =>
      buildOllamaUrl("http://alice:secret@ollama.internal:11434", "/api/chat")
    ).toThrow("must not include embedded credentials");
  });
});
