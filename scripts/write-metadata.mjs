#!/usr/bin/env node
/**
 * Write UBBX catalog JSON to metadata/<listingId>.json using the same canonical
 * form as app.js (fixed key order, no pretty-print) so keccak256 matches on-chain.
 *
 * Usage (from repo root):
 *   node scripts/write-metadata.mjs <listingId> path/to/metadata-N.json
 *   cat path/to/downloaded.json | node scripts/write-metadata.mjs <listingId>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const metadataDir = path.join(repoRoot, "metadata");

function canonicalMetadata(m) {
    const o = {
        title: m.title || "",
        author: m.author || "",
        edition: m.edition || "",
        notes: m.notes || "",
        imageURL: m.imageURL || "",
        contact: m.contact || "",
    };
    return JSON.stringify(o);
}

const id = process.argv[2];
const inputPath = process.argv[3];

if (!id || !/^\d+$/.test(id)) {
    console.error(
        "Usage: node scripts/write-metadata.mjs <listingId> [path/to.json]"
    );
    console.error("  Omit the file path to read JSON from stdin.");
    process.exit(1);
}

let raw;
if (inputPath) {
    raw = fs.readFileSync(inputPath, "utf8");
} else {
    raw = fs.readFileSync(0, "utf8");
    if (!raw.trim()) {
        console.error("No JSON on stdin. Pass a file path or pipe JSON.");
        process.exit(1);
    }
}

let parsed;
try {
    parsed = JSON.parse(raw);
} catch (e) {
    console.error("Invalid JSON:", e.message);
    process.exit(1);
}

const out = canonicalMetadata(parsed);
fs.mkdirSync(metadataDir, { recursive: true });
const dest = path.join(metadataDir, `${id}.json`);
fs.writeFileSync(dest, out, "utf8");
console.log("Wrote", dest);
