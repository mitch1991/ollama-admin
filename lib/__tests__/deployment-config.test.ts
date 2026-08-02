import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const deploymentFiles = [
  "docker-compose.yml",
  "install.sh",
  "scripts/install.sh",
  "scripts/install-offline.sh",
];

describe("Docker host access configuration", () => {
  it.each(deploymentFiles)("maps the host gateway in %s", (file) => {
    const contents = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(contents).toMatch(
      /\n {4}extra_hosts:\n {6}- "host\.docker\.internal:host-gateway"/
    );
  });

  it("keeps Docker defaults inside the persistent volume and on the host gateway", () => {
    const contents = readFileSync(
      resolve(process.cwd(), ".env.docker.example"),
      "utf8"
    );

    expect(contents).toContain('DATABASE_URL="file:/data/ollama-admin.db"');
    expect(contents).toContain(
      'DEFAULT_OLLAMA_URL="http://host.docker.internal:11434"'
    );
  });
});
