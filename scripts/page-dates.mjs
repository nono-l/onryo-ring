/**
 * 各ページの article:modified_time を、本文ファイルの変化だけから決める。
 * now() もビルド時刻も使わない。内容が同じなら前の日時を保つ。
 *
 * - 未コミットの変更 … そのファイルを保存した時刻
 * - コミット済みで内容が変わった … そのコミットの時刻
 * - 内容が前と同じ … 記録済みの日時のまま（チェックアウトや再デプロイでは動かない）
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "src/lib/page-dates.generated.ts");

const PAGE_SOURCES = [
  { path: "/", roots: ["src/game"] },
  { path: "/how", roots: ["src/routes/how.tsx"] },
  { path: "/terms", roots: ["src/routes/terms.tsx"] },
  { path: "/login", roots: ["src/routes/login.tsx"] },
];

export function chooseModified({ hash, prev, git, dirty }) {
  if (prev && prev.hash === hash && prev.modified) {
    return { modified: prev.modified, published: keptPublished(prev.published, prev.modified) };
  }
  const modified = dirty || git || prev?.modified || null;
  if (!modified) return null;
  return { modified, published: keptPublished(prev?.published, modified) };
}

function keptPublished(published, modified) {
  return published && published !== modified ? published : undefined;
}

function toJst(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const h = get("hour");
  const min = get("minute");
  const s = get("second");
  if (!y || !m || !d || !h || !min || !s) return null;
  return `${y}-${m}-${d}T${h}:${min}:${s}+09:00`;
}

function walk(rel) {
  const abs = join(root, rel);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return [];
  }
  if (st.isFile()) return [rel];
  const out = [];
  for (const ent of readdirSync(abs, { withFileTypes: true })) {
    if (ent.name === "page-dates.generated.ts") continue;
    out.push(...walk(`${rel}/${ent.name}`));
  }
  return out;
}

function pageFiles(page) {
  return page.roots.flatMap(walk).sort();
}

export function isPageSource(abs) {
  const rel = relative(root, abs).replaceAll("\\", "/");
  if (!rel || rel === "src/lib/page-dates.generated.ts") return false;
  return PAGE_SOURCES.some((page) => pageFiles(page).includes(rel));
}

function hashFiles(files) {
  const hash = createHash("sha256");
  for (const rel of files) {
    hash.update(rel);
    hash.update("\0");
    hash.update(readFileSync(join(root, rel)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function gitTime(files) {
  if (!files.length) return null;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...files], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    return out ? toJst(out) : null;
  } catch {
    return null;
  }
}

function dirtyMtime(files) {
  if (!files.length) return null;
  let status = "";
  try {
    status = execFileSync("git", ["status", "--porcelain", "-z", "--", ...files], {
      cwd: root,
      encoding: "utf8",
    });
  } catch {
    return null;
  }
  if (!status) return null;
  let max = 0;
  for (const entry of status.split("\0")) {
    if (!entry) continue;
    const path = entry.slice(3).trim();
    if (!path || path.includes(" -> ")) continue;
    try {
      const mtime = statSync(join(root, path)).mtimeMs;
      if (mtime > max) max = mtime;
    } catch {
      /* deleted */
    }
  }
  return max ? toJst(max) : null;
}

function readLedger() {
  try {
    const text = readFileSync(outFile, "utf8");
    const m = text.match(/export const PAGE_DATE_LEDGER[^=]*=\s*(\{[\s\S]*\n\});/);
    if (!m) return {};
    const parsed = JSON.parse(m[1]);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function render(ledger) {
  const dates = {};
  for (const [path, row] of Object.entries(ledger)) {
    if (!row?.modified) continue;
    dates[path] = row.published ? { modified: row.modified, published: row.published } : { modified: row.modified };
  }
  return `/* このファイルは scripts/page-dates.mjs が書く。手で直さない。 */
export const PAGE_DATES: Record<string, { modified: string; published?: string }> = ${JSON.stringify(dates, null, 2)};

export const PAGE_DATE_LEDGER: Record<string, { modified: string; hash: string; published?: string }> = ${JSON.stringify(ledger, null, 2)};
`;
}

export function stampPageDates() {
  const prevAll = readLedger();
  const next = {};
  for (const page of PAGE_SOURCES) {
    const files = pageFiles(page);
    if (!files.length) continue;
    const hash = hashFiles(files);
    const chosen = chooseModified({
      hash,
      prev: prevAll[page.path],
      git: gitTime(files),
      dirty: dirtyMtime(files),
    });
    if (!chosen) continue;
    next[page.path] = { modified: chosen.modified, hash, ...(chosen.published ? { published: chosen.published } : {}) };
  }
  const body = render(next);
  let current = "";
  try {
    current = readFileSync(outFile, "utf8");
  } catch {
    /* first write */
  }
  if (current === body) return false;
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, body);
  return true;
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  stampPageDates();
}
