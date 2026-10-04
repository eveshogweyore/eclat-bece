/**
 * Central TanStack Query key registry.
 *
 * Conventions:
 * - Keys are hierarchical arrays: [domain, ...identifiers, ...params].
 * - Query data is considered a cache: prefer invalidateQueries over manual
 *   state refresh after mutations that affect a domain.
 * - staleTime defaults live in App.tsx (2 minutes); hooks may override.
 */
export const queryKeys = {
  /** Parent's own account record (id + connection code). */
  parentAccount: (userId?: string | null) => ["parent-account", userId ?? "anon"] as const,

  /** Admin profile + permission flags for the signed-in admin. */
  adminPermissions: (userId?: string | null) => ["admin-permissions", userId ?? "anon"] as const,

  /** Current week's 30-player league cohort for the signed-in student. */
  leagueCohort: (userId?: string | null) => ["league-cohort", userId ?? "anon"] as const,

  /** Subject catalogue, optionally with per-cohort question counts. */
  subjects: (classYear: string, onlyActive: boolean, withCounts: boolean) =>
    ["subjects", classYear, onlyActive, withCounts] as const,

  /** Aggregated school-portal dataset (students, classes, exams, teachers...). */
  school: (userId?: string | null) => ["school", userId ?? "anon"] as const,

  /** Leaderboard data by scope (weekly/monthly/annual/subject/school). */
  leaderboard: (scope: string) => ["leaderboard", scope] as const,

  /** Notification list for a user id (kept fresh via realtime invalidation). */
  notifications: (userId?: string | null) => ["notifications", userId ?? "anon"] as const,

  /** Admin flag-reports list: paginated + filtered (status/class year/reason/page). */
  flagReports: (filters: { status: string; classYear: string; reason: string; page: number }) =>
    ["flag-reports", "list", filters] as const,

  /** Count of pending flag reports (filter badge). */
  flagReportsPendingCount: () => ["flag-reports", "pending-count"] as const,

  /** Teacher dashboard dataset (own registry row, classes, roster, assignments). */
  teacher: (userId?: string | null) => ["teacher-portal", userId ?? "anon"] as const,
} as const;
