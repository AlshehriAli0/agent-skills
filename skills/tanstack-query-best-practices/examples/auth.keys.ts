/**
 * src/api/auth/auth.keys.ts
 *
 * The single source of truth for every auth-related queryKey.
 * - Every entry is a function (even no-arg ones) so `queryOptions()` is fresh per call.
 * - Spread the result into `useQuery` / `prefetchQuery` / `ensureQueryData` / `setQueryData`.
 * - Mutations invalidate via `authQueries.all()` or `authQueries.x().queryKey` — never a stringly-typed array.
 */

import { queryOptions } from "@tanstack/react-query";

import {
  fetchAccount,
  fetchAccountCard,
  fetchAccountMinimalInfo,
  searchAccounts,
} from "./auth.requests";

export const authQueries = {
  // The root — spread into every query below. Invalidate it to clear the whole feature.
  all: () => ["auth"] as const,

  // Single-entity read
  account: () =>
    queryOptions({
      queryKey: [...authQueries.all(), "account"],
      queryFn: fetchAccount,
      meta: { persist: true },
    }),

  // Optional-id variant
  minimalAccount: (accountId?: number) =>
    queryOptions({
      queryKey: [...authQueries.all(), "minimal", accountId],
      queryFn: () => fetchAccountMinimalInfo(accountId),
      enabled: !!accountId,
      meta: { persist: true },
    }),

  // Lookup by alternate id
  accountCard: (encryptedPhone: string) =>
    queryOptions({
      queryKey: [...authQueries.all(), "card", encryptedPhone],
      queryFn: () => fetchAccountCard(encryptedPhone),
      enabled: !!encryptedPhone,
    }),

  // Search — every (term, flag) caches independently; clear all via [...all(), "search"]
  searchAccounts: (term: string, verifiedOnly?: boolean) =>
    queryOptions({
      queryKey: [...authQueries.all(), "search", term, verifiedOnly],
      queryFn: () => searchAccounts(term, verifiedOnly),
      enabled: term.length > 0,
    }),
};
