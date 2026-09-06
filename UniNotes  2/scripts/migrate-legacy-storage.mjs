import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const bundleIds = [
  "dk.noteit.uninotes.current",
  "com.notyvia.study",
  "dk.uninotes.study",
  "com.notelyra.study",
  "com.noted.study",
];

function readStorage(database) {
  const rows = execFileSync("sqlite3", [
    database,
    "select json_object('key',key,'hex',hex(value)) from ItemTable order by key;",
  ], { encoding: "utf8" }).trim();
  if (!rows) return {};
  return Object.fromEntries(rows.split("\n").map(line => {
    const row = JSON.parse(line);
    return [row.key, Buffer.from(row.hex, "hex").toString("utf16le")];
  }));
}

function databasesFor(bundleId) {
  const root = join(homedir(), "Library", "WebKit", bundleId, "WebsiteData", "Default");
  if (!existsSync(root)) return [];
  const output = execFileSync("find", [
    root, "-path", "*/LocalStorage/localstorage.sqlite3", "-type", "f", "-print",
  ], { encoding: "utf8" }).trim();
  return output ? output.split("\n") : [];
}

const mergedAccounts = new Map();
const storage = {};

for (const bundleId of bundleIds) {
  for (const database of databasesFor(bundleId)) {
    const legacy = readStorage(database);
    let accounts = [];
    try {
      accounts = JSON.parse(legacy["noteit-accounts"] || "[]");
    } catch {
      accounts = [];
    }

    for (const account of accounts) {
      const email = String(account.email || "").trim().toLowerCase();
      if (!email) continue;
      const previous = mergedAccounts.get(email) || {};
      mergedAccounts.set(email, { ...previous, ...account, email });
      const prefix = `noteit-user:${email}:`;
      if (legacy["stemnotes-v5"]) storage[`${prefix}workspace`] = legacy["stemnotes-v5"];
      if (legacy["stemnotes-settings"]) storage[`${prefix}settings`] = legacy["stemnotes-settings"];
      if (legacy["stemnotes-exams"]) storage[`${prefix}exams`] = legacy["stemnotes-exams"];
      if (legacy["noteit-rewards"]) storage[`${prefix}rewards`] = legacy["noteit-rewards"];
    }
  }
}

storage["noteit-accounts"] = JSON.stringify([...mergedAccounts.values()]);
storage["noted-dark"] = "0";

const target = process.argv[2] || join(
  homedir(), "Library", "Application Support", "Noteit", "database.json",
);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({
  version: 1,
  migratedAt: new Date().toISOString(),
  storage,
}, null, 2), { mode: 0o600 });

console.log(JSON.stringify({
  target,
  accounts: mergedAccounts.size,
  workspaces: Object.keys(storage).filter(key => key.endsWith(":workspace")).length,
}));
