/**
 * Paths that more than one module has to agree on.
 *
 * `/` is the public marketing page — the front door for someone who has never
 * used GereeZ — so the signed-in dashboard lives at `/app`. Anything that sends
 * an authenticated user "home" means DASHBOARD_PATH, not `/`.
 */
export const DASHBOARD_PATH = "/app";

/** The landing page. Public: reachable without a session. */
export const LANDING_PATH = "/";
