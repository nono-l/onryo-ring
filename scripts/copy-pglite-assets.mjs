#!/usr/bin/env node
/**
 * Nitro が pglite の wasm を関数隣に出さない。本番プレビュー（DATABASE_URL なし）
 * が PGLite で落ちるので、dist からコピーする。デプロイ先は Neon なので実害はない。
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@electric-sql/pglite/dist");
const dest = join(root, ".vercel/output/functions/__server.func/_libs");
if (!existsSync(src) || !existsSync(dirname(dest))) process.exit(0);
mkdirSync(dest, { recursive: true });
for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  const from = join(src, name);
  if (existsSync(from)) copyFileSync(from, join(dest, name));
}
