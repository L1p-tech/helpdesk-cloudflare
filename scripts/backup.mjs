/**
 * Exportiert die Produktionsdatenbank als SQL-Datei nach backups/.
 *
 * Aufruf: npm run db:backup
 * Die Datei enthaelt Passwort-Hashes und alle Fallinhalte -- sie gehoert nicht
 * ins Repository (backups/ steht in .gitignore) und sollte sicher abgelegt werden.
 * Es bleiben die letzten 30 Sicherungen erhalten.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";

const ORDNER = "backups";
const BEHALTEN = 30;
const datei = `${ORDNER}/helpdesk-${new Date().toISOString().slice(0, 10)}.sql`;

mkdirSync(ORDNER, { recursive: true });
const lauf = spawnSync(
  "npx",
  ["wrangler", "d1", "export", "helpdesk-db", "--remote", "--output", datei],
  { stdio: "inherit", env: { ...process.env, npm_config_loglevel: "silent" } },
);
if (lauf.status !== 0) {
  console.error("\nDer Export ist fehlgeschlagen.");
  process.exit(lauf.status ?? 1);
}

const alt = readdirSync(ORDNER)
  .filter((name) => /^helpdesk-\d{4}-\d{2}-\d{2}\.sql$/.test(name))
  .sort()
  .slice(0, -BEHALTEN);
for (const name of alt) rmSync(`${ORDNER}/${name}`);
console.log(`\nSicherung gespeichert: ${datei}`);
