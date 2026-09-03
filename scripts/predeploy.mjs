/**
 * Stellt sicher, dass das Datenbankschema vor dem Deploy zum Code passt.
 *
 * Hintergrund: Geht der Worker live, bevor seine Migrationen angewendet sind,
 * schreibt er in Spalten, die es in der Produktion noch nicht gibt -- die
 * betroffenen Seiten antworten dann mit einem internen Serverfehler. Genau das
 * ist am 03.09.2026 mit der Avatar-Spalte passiert.
 *
 * Ablauf: offene Migrationen anzeigen, kurz bestaetigen lassen, anwenden.
 * Die Bestaetigung ist Absicht -- Schemaaenderungen an der Produktion sind in
 * der Regel nicht umkehrbar, und im Ordner kann auch eine noch nicht fertige
 * Migration liegen.
 *
 * Ohne Terminal (CI, Pipeline) wird nicht blind angewendet, sondern
 * abgebrochen: Dort kann niemand bestaetigen. Mit HELPDESK_MIGRATE=ja laesst
 * sich das bewusst uebergehen.
 */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const DATENBANK = "helpdesk-db";

/** Fuehrt wrangler aus und reicht die Ausgabe durch. */
function wrangler(args, optionen = {}) {
  return spawnSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    shell: false,
    // Ohne diese Zeile mischt npm seine "notice"-Zeilen in die Ausgabe und
    // sie erscheinen mitten in der Migrationsliste.
    env: { ...process.env, npm_config_loglevel: "silent" },
    ...optionen,
  });
}

const liste = wrangler(["d1", "migrations", "list", DATENBANK, "--remote"]);
const ausgabe = `${liste.stdout || ""}${liste.stderr || ""}`;

if (liste.status !== 0) {
  console.error("\nDer Migrationsstand liess sich nicht abfragen:\n");
  console.error(ausgabe.trim());
  console.error(
    "\nDeploy abgebrochen. Wenn das gewollt ist, laeuft `npx wrangler deploy` weiterhin direkt.\n",
  );
  process.exit(1);
}

// Wrangler meldet diesen Satz, wenn nichts offen ist.
if (ausgabe.includes("No migrations to apply")) {
  console.log("Datenbankschema ist aktuell -- weiter zum Deploy.\n");
  process.exit(0);
}

console.log("\nOffene Migrationen fuer die PRODUKTIONS-Datenbank:\n");
// Nur den Tabellenteil zeigen; die Kopfzeilen von wrangler sind hier Rauschen.
const zeilen = ausgabe.split("\n");
const start = zeilen.findIndex((zeile) => zeile.includes("Migrations to be applied"));
console.log((start >= 0 ? zeilen.slice(start + 1) : zeilen).join("\n").trim());

if (process.env.HELPDESK_MIGRATE === "ja") {
  console.log("\nHELPDESK_MIGRATE=ja gesetzt -- wird ohne Rueckfrage angewendet.");
} else if (!stdin.isTTY) {
  console.error(
    "\nKein Terminal fuer die Rueckfrage vorhanden. Bitte vorab" +
      "\n  npm run db:migrate:remote" +
      "\nausfuehren oder HELPDESK_MIGRATE=ja setzen.\n",
  );
  process.exit(1);
} else {
  const frage = createInterface({ input: stdin, output: stdout });
  const antwort = await frage.question(
    "\nAnwenden und dann deployen? [Enter] fortfahren, [n] abbrechen: ",
  );
  frage.close();

  if (antwort.trim().toLowerCase().startsWith("n")) {
    console.log("\nAbgebrochen. Es wurde nichts geaendert.\n");
    process.exit(1);
  }
}

console.log("");
const anwenden = wrangler(
  ["d1", "migrations", "apply", DATENBANK, "--remote"],
  { stdio: "inherit" },
);

if (anwenden.status !== 0) {
  console.error("\nMigration fehlgeschlagen -- es wird nicht deployt.\n");
  process.exit(1);
}

console.log("\nSchema aktuell -- weiter zum Deploy.\n");
