import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC_ROOT = path.resolve(process.cwd(), "src");

function resolveCandidate(filePath) {
  if (existsSync(filePath) && !filePath.endsWith("/")) {
    return filePath;
  }
  const tsPath = `${filePath}.ts`;
  if (existsSync(tsPath)) {
    return tsPath;
  }
  const tsxPath = `${filePath}.tsx`;
  if (existsSync(tsxPath)) {
    return tsxPath;
  }
  const indexTs = path.join(filePath, "index.ts");
  if (existsSync(indexTs)) {
    return indexTs;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = resolveCandidate(path.join(SRC_ROOT, specifier.slice(2)));
      if (target) {
        return { url: pathToFileURL(target).href, shortCircuit: true };
      }
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const target = resolveCandidate(path.resolve(parentDir, specifier));
      if (target) {
        return { url: pathToFileURL(target).href, shortCircuit: true };
      }
    }

    return nextResolve(specifier, context);
  },
});
