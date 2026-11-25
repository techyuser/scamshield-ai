import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "src", "app", "api");
const backupApiDir = path.join(root, ".tmp-api-export-backup");
const outDir = path.join(root, "out");
const dropDir = path.join(root, "netlify-drop");
const zipPath = path.join(root, "scamshield-netlify-drop.zip");

function run(cmd, env = process.env) {
  execSync(cmd, { cwd: root, stdio: "inherit", env });
}

if (fs.existsSync(backupApiDir)) {
  throw new Error("Backup API directory already exists; clean .tmp-api-export-backup first.");
}

try {
  // Temporarily hide server API routes so Next.js static export succeeds cleanly.
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, backupApiDir);
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.rmSync(dropDir, { recursive: true, force: true });
  fs.rmSync(zipPath, { force: true });

  run("pnpm exec next build", { ...process.env, STATIC_EXPORT: "true" });

  fs.cpSync(outDir, dropDir, { recursive: true });
  fs.writeFileSync(path.join(dropDir, "_redirects"), "/* /index.html 200\n");

  run(`ditto -c -k --sequesterRsrc --keepParent "${dropDir}" "${zipPath}"`);
} finally {
  if (fs.existsSync(backupApiDir)) {
    fs.renameSync(backupApiDir, apiDir);
  }
}

console.log(`\nCreated Netlify Drop folder: ${dropDir}`);
console.log(`Created Netlify Drop zip:    ${zipPath}`);
