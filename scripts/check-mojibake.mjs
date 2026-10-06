#!/usr/bin/env node
// Detects and optionally repairs Windows-1252 mojibake: UTF-8 text that was
// decoded as cp1252 somewhere in an editing pipeline. The sparkles emoji
// (U+2728) stored as U+00E2 U+0153 U+00A8, the ellipsis (U+2026) stored as
// U+00E2 U+20AC U+00A6, the right single quote (U+2019) stored as
// U+00E2 U+20AC U+2122, and so on. Repairs by re-encoding the corrupted run
// as cp1252 and decoding it back as UTF-8, repeatedly (handles double or
// triple encoding), per maximal non-ASCII run so legitimate accented text
// ("Eclat" with the real E-acute, "cafe") is left untouched when it cannot
// round-trip.
//
// Usage:
//   node scripts/check-mojibake.mjs            # scan and print findings
//   node scripts/check-mojibake.mjs --check    # same, exit 1 when found (CI)
//   node scripts/check-mojibake.mjs --fix      # rewrite corrupted files

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname, sep } from "node:path";

const fix = process.argv.includes("--fix");
const checkOnly = process.argv.includes("--check");
const root = process.cwd();
const skipDirs = new Set(["node_modules", ".git", "dist", ".zcode", ".vercel"]);
const scanExts = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".html", ".css",
  ".md", ".sql", ".toml", ".svg", ".txt", ".yml", ".yaml",
]);

// cp1252 codepoints for the 0x80–0x9F range (everything else is Latin-1).
const high = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

function cp1252Byte(ch) {
  const cp = ch.codePointAt(0);
  if (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff)) return cp;
  return high[cp] ?? null;
}

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

// One decode pass; null when the run is not repairable mojibake.
function repairOnce(s) {
  const bytes = [];
  for (const ch of s) {
    const b = cp1252Byte(ch);
    if (b === null) return null;
    bytes.push(b);
  }
  try {
    return strictUtf8.decode(Uint8Array.from(bytes));
  } catch {
    return null;
  }
}

function repairRun(s) {
  let cur = s;
  let changed = false;
  for (let i = 0; i < 4; i++) {
    const next = repairOnce(cur);
    if (next === null || next === cur) break;
    // Never accept a decode that introduces control characters or a stray
    // byte-order mark — that means the run was legitimate text after all.
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u00c2\u0080-\u009f\ufffd]/u.test(next)) break;
    cur = next;
    changed = true;
  }
  return changed ? cur : null;
}

// Leaders that almost only occur in (possibly lossy) mojibake.
const suspect = new RegExp("[\\u00c3\\u00e2\\u00f0\\u00ef\\u00c2\\u00c5]", "u");

function esc(s) {
  return s.replace(/[^\u0020-\u007e]/gu, (ch) =>
    "\\u{" + ch.codePointAt(0).toString(16) + "}"
  );
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(join(dir, entry.name), out);
    } else if (scanExts.has(extname(entry.name).toLowerCase())) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

let fixableFiles = 0;
let suspiciousFiles = 0;
const findings = [];

for (const path of walk(root)) {
  if (path.split(sep).some((part) => skipDirs.has(part))) continue;
  const text = readFileSync(path, "utf-8");
  const lines = text.split("\n");
  let fileTouched = false;
  let fileSuspect = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const repaired = line.replace(/[^\u0000-\u007f]+/gu, (run) => {
      const fixed = repairRun(run);
      if (fixed !== null) {
        findings.push(
          `${path}:${i + 1}: ${esc(run)} -> ${esc(fixed)}`
        );
        fileTouched = true;
        return fixed;
      }
      if (suspect.test(run)) {
        findings.push(
          `${path}:${i + 1}: SUSPECT (unrepairable) ${esc(run)}`
        );
        fileSuspect = true;
      }
      return run;
    });
    lines[i] = repaired;
  }

  if ((fileTouched || fileSuspect) && (fileTouched ? fixableFiles++ : suspiciousFiles++, fix)) {
    writeFileSync(path, lines.join("\n"), "utf-8");
  }
}

if (findings.length === 0) {
  console.log("No mojibake found.");
} else {
  for (const f of findings) console.log(f);
  console.log(
    `\n${findings.length} finding(s) across ${fixableFiles + suspiciousFiles} file(s).`
  );
}
if (checkOnly && (fixableFiles > 0 || suspiciousFiles > 0)) process.exit(1);
