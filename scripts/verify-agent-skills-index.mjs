import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const indexPath = join(root, ".well-known/agent-skills/index.json");
const expectedSchema = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

const index = JSON.parse(await readFile(indexPath, "utf8"));
const failures = [];

if (index.$schema !== expectedSchema) {
  failures.push(`unexpected $schema: ${index.$schema}`);
}

if (!Array.isArray(index.skills) || index.skills.length === 0) {
  failures.push("skills must be a non-empty array");
}

for (const skill of index.skills || []) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(skill.name || "")) {
    failures.push(`invalid skill name: ${skill.name}`);
  }
  if (skill.type !== "skill-md" && skill.type !== "archive") {
    failures.push(`invalid type for ${skill.name}: ${skill.type}`);
  }
  for (const key of ["description", "url", "digest"]) {
    if (typeof skill[key] !== "string" || !skill[key]) {
      failures.push(`${skill.name || "unknown"} missing ${key}`);
    }
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(skill.digest || "")) {
    failures.push(`${skill.name} has invalid digest format`);
    continue;
  }
  if (skill.type === "skill-md") {
    const artifactPath = join(root, skill.url.replace(/^\//, ""));
    const artifact = await readFile(artifactPath);
    const digest = `sha256:${createHash("sha256").update(artifact).digest("hex")}`;
    if (digest !== skill.digest) {
      failures.push(`${skill.name} digest mismatch: ${digest}`);
    }
  }
}

console.log(JSON.stringify({ skillCount: index.skills?.length || 0, failures }, null, 2));

if (failures.length) {
  process.exitCode = 1;
}
