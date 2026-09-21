import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../lib/api-spec/package.json", import.meta.url));
const SwaggerParser = require("@apidevtools/swagger-parser");
const generated = ["lib/api-client-react/src/generated", "lib/api-zod/src/generated"];

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed during API contract verification.`);
  }
  return result.stdout;
}

function snapshot() {
  const files = new Set(run("git", ["ls-files", "-z", "--", ...generated], true).split("\0").filter(Boolean));
  function walk(directory) {
    if (!existsSync(`${root}${directory}`)) return;
    for (const entry of readdirSync(`${root}${directory}`, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else files.add(path);
    }
  }
  generated.forEach(walk);
  return JSON.stringify([...files].sort().map((path) => [
    path, existsSync(`${root}${path}`) ? readFileSync(`${root}${path}`).toString("base64") : null,
  ]));
}

try {
  await SwaggerParser.validate(`${root}lib/api-spec/openapi.yaml`);
  const before = snapshot();
  run("pnpm", ["--filter", "@workspace/api-spec", "run", "codegen"]);
  if (before !== snapshot()) {
    throw new Error("Codegen changed generated API sources. Review regenerated files in both generated directories and rerun the check.");
  }
  console.log("OpenAPI validation and generated-source verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "API contract verification failed.");
  process.exitCode = 1;
}