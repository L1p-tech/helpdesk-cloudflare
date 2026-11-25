/**
 * Worker-Einstiegspunkt des 2nd-Level-Helpdesks.
 *
 * Aufbau:
 *   - `handleApi` prueft Origin und Session und reicht die Anfrage dann durch
 *     eine Kette von Handlern (`handleAuth`, `handleTemplates`, ...).
 *   - Jeder Handler gibt `null` zurueck, wenn er fuer Pfad/Methode nicht
 *     zustaendig ist. Der erste Handler, der eine Response liefert, gewinnt.
 *   - Alles, was nicht unter /api liegt, wird an die statischen Assets
 *     durchgereicht.
 *
 * Fehlerbehandlung laeuft zentral: Handler werfen `HttpError`, `errorResponse`
 * uebersetzt das in eine JSON-Antwort. Kein Handler baut Fehler-Responses selbst.
 *
 * Rollenmodell: employee < editor < admin. Die Pruefung erfolgt ausschliesslich
 * hier im Worker (`requireRole`), niemals im Frontend.
 */
import { authenticate, requireUser } from "./auth";
import { handleReminders, handleNotifications, deliverDueReminders } from "./notifications";
import { assertSameOrigin, errorResponse, HttpError } from "./http";
import type { Env } from "./types";
import { routePath, isApi } from "./shared";
import { handleAuth } from "./handlers/auth";
import { handleBootstrap, handleSettings } from "./handlers/bootstrap";
import { handleProposals, handleCategories, handleTemplates } from "./handlers/templates";
import { handleCommands, handleContentProposals, handleSolutions } from "./handlers/library";
import { handleFeedback } from "./handlers/feedback";
import { handleUsers } from "./handlers/users";
import { handleHistory } from "./handlers/history";
import { handleCases, handleEscalation, handleHandovers } from "./handlers/cases";
import { handleUsage } from "./handlers/usage";
import { handleGame } from "./handlers/game";
import { handleNews, refreshNewsIfStale } from "./handlers/news";
import { handleChat } from "./handlers/chat";
import { handleTraining } from "./handlers/training";

/** Handler nach dem Login. Reihenfolge egal -- die Pfade ueberschneiden sich nicht. */
const AUTHENTICATED_HANDLERS = [
  handleBootstrap,
  handleSettings,
  handleProposals,
  handleCategories,
  handleTemplates,
  handleCommands,
  handleSolutions,
  handleContentProposals,
  handleCases,
  handleReminders,
  handleNotifications,
  handleEscalation,
  handleHandovers,
  handleUsage,
  handleFeedback,
  handleUsers,
  handleHistory,
  handleGame,
  handleChat,
  handleNews,
  handleTraining,
];

async function handleApi(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const path = routePath(request);
  const user = await authenticate(request, env);

  // Login, Logout und Setup muessen ohne gueltige Sitzung erreichbar sein.
  const authResponse = await handleAuth(request, env, user, path);
  if (authResponse) return authResponse;

  const authenticatedUser = requireUser(user);

  for (const handler of AUTHENTICATED_HANDLERS) {
    const response = await handler(request, env, authenticatedUser, path);
    if (response) return response;
  }

  throw new HttpError(404, "API-Endpunkt nicht gefunden.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = routePath(request);

    try {
      if (isApi(path)) return await handleApi(request, env);
      return await env.ASSETS.fetch(request);
    } catch (error) {
      return errorResponse(error);
    }
  },

  /**
   * Zeitgesteuerter Lauf (siehe `triggers.crons` in wrangler.jsonc).
   *
   * Holt die Nachrichtenquellen unabhaengig davon, ob jemand die Seite
   * benutzt. Ohne diesen Lauf wuerde nach einem Wochenende ohne Zugriff erst
   * der naechste Seitenaufruf die Meldungen nachladen.
   *
   * `force` bleibt aus: Der Lauf soll dieselbe Alterspruefung anwenden wie der
   * Seitenaufruf, damit ein zwischenzeitlicher Abruf nicht sofort wiederholt
   * wird. Erinnerungen werden jede Minute, Feeds nur bei Bedarf bearbeitet.
   */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    try {
      await refreshNewsIfStale(env, false);
    } catch (error) {
      // Ein Fehler hier darf den Lauf nicht als fehlgeschlagen enden lassen --
      // die einzelnen Quellen behandeln ihre Fehler bereits selbst, und ein
      // erneuter Versuch folgt ohnehin in 30 Minuten.
      console.error("Zeitgesteuerter Feed-Abruf fehlgeschlagen:", error);
    }

    // Eigener Block: Schlaegt der Feed-Abruf fehl, sollen die Erinnerungen
    // trotzdem zugestellt werden -- und umgekehrt.
    try {
      await deliverDueReminders(env);
    } catch (error) {
      console.error("Zustellung faelliger Erinnerungen fehlgeschlagen:", error);
    }
  },
} satisfies ExportedHandler<Env>;
