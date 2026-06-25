#!/usr/bin/env node
/**
 * Issue a DeskYield API key and print the environment record to persist.
 *
 * Usage:
 *   node scripts/issue-key.mjs                       # key with no origin restriction (server-to-server)
 *   node scripts/issue-key.mjs https://app.example.com   # key whose visitor tokens may come from this origin
 *   node scripts/issue-key.mjs https://a.com https://b.com
 *
 * Output:
 *   - The full API key (copy once, store securely).
 *   - The JSON record to paste into DESKYIELD_API_KEYS.
 *   - The DESKYIELD_DEMO_API_KEY line if you want to use it for the /widget demo.
 */
import { createHash, randomBytes } from "node:crypto";

const origins = process.argv.slice(2).map((o) => o.trim().toLowerCase());

const id = randomBytes(6).toString("hex");
const secret = randomBytes(24).toString("hex");
const key = `dsky_${id}_${secret}`;
const hash = createHash("sha256").update(secret, "utf8").digest("hex");

const record = { id, hash, origins };
// Emit UNQUOTED literal JSON — the form Next's env loader parses reliably.
// (Double-quote + backslash-escaped values don't unescape correctly in .env.)
const line = "DESKYIELD_API_KEYS=" + JSON.stringify([record]);

console.log("\n=== DeskYield API key (store securely, shown once) ===");
console.log(key);
console.log("\n=== Append to .env.local ===");
console.log(line);
console.log(`DESKYIELD_DEMO_API_KEY=${key}   # optional: enables the /widget demo`);
console.log(`# DESKYIELD_TOKEN_SECRET=...   # set ONCE (openssl rand -hex 32); keep stable. Reuse your existing value — do NOT regenerate per key.`);
console.log("\nRecord:");
console.log(JSON.stringify(record, null, 2));
console.log("");
