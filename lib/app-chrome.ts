/**
 * What the mobile status bar shows for a route, and where its back button
 * goes.
 *
 * "Back" used to mean `router.back()`, which is browser history, not app
 * structure. Both screens that show the button — a contract's audit and the
 * credit screen — are linked to directly from the notification feed, so either
 * can be the first page of a session; pressing back then leaves the app
 * entirely, which is not what a back chevron inside an app promises. Each
 * screen names its parent instead, so the button always lands somewhere in the
 * app and always lands in the same place.
 *
 * Free of server-only imports: the status bar is a client component.
 */

import { DASHBOARD_PATH } from "./routes";

export interface AppChrome {
  title: string;
  /** Overrides the title from `lg` up, where the header carries the brand. */
  desktop?: string;
  /** Where the back chevron goes, or null on a top-level screen (no chevron). */
  up: string | null;
}

export function chromeFor(pathname: string): AppChrome {
  if (pathname === "/contracts") return { title: "Гэрээнүүд", up: null };
  // The audit belongs to the list it was opened from — not to whatever the
  // browser happened to show before it.
  if (/^\/contracts\/.+/.test(pathname)) return { title: "Аудит дүн", up: "/contracts" };
  if (pathname === "/alerts") return { title: "Мэдэгдэл", up: null };
  if (pathname === "/payment") return { title: "Кредит", up: DASHBOARD_PATH };
  if (pathname === "/settings") return { title: "Тохиргоо", up: null };
  return { title: "GereeZ", desktop: "Нүүр", up: null };
}
