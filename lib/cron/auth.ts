/**
 * Cron-route authorization (RB51). Shared by every scheduled route so the guard is
 * identical and testable in one place.
 *
 * Vercel Cron invokes a job's path with a GET request and, when `CRON_SECRET` is set on
 * the project, attaches an `Authorization: Bearer ${CRON_SECRET}` header automatically -
 * so a matching bearer is the primary accepted credential. We also accept a legacy
 * `x-cron-secret` header so existing on-demand demo calls (curl / the expire-listings
 * POST) keep working unchanged.
 *
 * When `CRON_SECRET` is unset the route is OPEN in development only and CLOSED in
 * production (fail closed): a scheduled job must never run unauthenticated in prod, but
 * local `curl` testing stays convenient. Secret lives server-side only (never
 * NEXT_PUBLIC_); see docs/SECRETS.md.
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}
