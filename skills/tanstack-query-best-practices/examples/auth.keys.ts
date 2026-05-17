/**
 * src/api/auth/auth.keys.ts
 *
 * The single source of truth for every auth-related queryKey.
 * - Every entry is a function (even no-arg ones) so `queryOptions()` is fresh per call.
 * - Spread the result into `useQuery` / `prefetchQuery` / `ensureQueryData` / `setQueryData`.
 * - Mutations invalidate via `authQueries.x().queryKey` — never a stringly-typed array.
 */

import { queryOptions } from "@tanstack/react-query";

import {
  fetchAccount,
  fetchAccountCard,
  fetchAccountMinimalInfo,
  searchAccounts,
} from "./auth.requests";

export const authQueries = {
  // No-arg / single-entity reads
  account: () =>
    queryOptions({
      queryKey: ["account"] as const,
      queryFn: fetchAccount,
      staleTime: 1000 * 60 * 15, // 15 min — account data is stable
      meta: { persist: true } as const,
    }),

  // Optional-id variant
  minimalAccount: (accountId?: number) =>
    queryOptions({
      queryKey: ["account", "minimal", accountId] as const,
      queryFn: () => fetchAccountMinimalInfo(accountId),
      enabled: !!accountId,
      meta: { persist: true } as const,
    }),

  // Lookup by alternate id
  accountCard: (encryptedPhone: string) =>
    queryOptions({
      queryKey: ["accountCard", encryptedPhone] as const,
      queryFn: () => fetchAccountCard(encryptedPhone),
      enabled: !!encryptedPhone,
    }),

  // Search — filter parts in the key, so every (term, flag) pair caches independently
  searchAccounts: (term: string, verifiedOnly?: boolean) =>
    queryOptions({
      queryKey: ["accounts", "search", term, verifiedOnly] as const,
      queryFn: () => searchAccounts(term, verifiedOnly),
      enabled: term.length > 0,
    }),

  // "Constants" prefix — used by mutations that need to invalidate every search variant
  searchAccountsConstant: () => ["accounts", "search"] as const,
};
