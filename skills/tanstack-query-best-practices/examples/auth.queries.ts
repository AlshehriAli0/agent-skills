/**
 * src/api/auth/auth.queries.ts
 *
 * useQuery hooks for auth. Each hook:
 * - takes an options object (never positional booleans),
 * - accepts a typed `queryConfig` so consumers can pass any normal useQuery option,
 * - composes its own `enabled` guard with the consumer's via `&&`.
 *
 * Notice there is no `queryKey: [...]` literal in this file. Every key lives in
 * auth.keys.ts and is spread in via `...authQueries.x()`.
 */

import { useQuery } from "@tanstack/react-query";

import { authQueries } from "./auth.keys";

import type { QueryConfig } from "../../lib/react-query";

// ---------------------------------------------------------------------------
// useAccount — current logged-in user
// ---------------------------------------------------------------------------

type UseAccountOptions = {
  queryConfig?: QueryConfig<typeof authQueries.account>;
  /** External signal — e.g. only fetch once we know a token exists */
  token?: string | null;
};

export const useAccount = ({ queryConfig = {}, token }: UseAccountOptions = {}) =>
  useQuery({
    ...authQueries.account(),
    ...queryConfig,
    enabled: !!token && queryConfig.enabled !== false,
  });

// ---------------------------------------------------------------------------
// useAccountMinimalInfo — by id
// ---------------------------------------------------------------------------

type UseAccountMinimalInfoOptions = {
  queryConfig?: QueryConfig<typeof authQueries.minimalAccount>;
};

export const useAccountMinimalInfo = (
  accountId?: number,
  { queryConfig = {} }: UseAccountMinimalInfoOptions = {}
) =>
  useQuery({
    ...authQueries.minimalAccount(accountId),
    ...queryConfig,
  });

// ---------------------------------------------------------------------------
// useAccountCard — lookup by encrypted phone
// ---------------------------------------------------------------------------

type UseAccountCardOptions = {
  queryConfig?: QueryConfig<typeof authQueries.accountCard>;
};

export const useAccountCard = (
  encryptedPhone: string,
  { queryConfig = {} }: UseAccountCardOptions = {}
) =>
  useQuery({
    ...authQueries.accountCard(encryptedPhone),
    ...queryConfig,
  });

// ---------------------------------------------------------------------------
// useSearchAccounts — debounced search
// ---------------------------------------------------------------------------

type UseSearchAccountsOptions = {
  queryConfig?: QueryConfig<typeof authQueries.searchAccounts>;
  searchTerm: string;
  verifiedOnly?: boolean;
};

export const useSearchAccounts = ({
  queryConfig = {},
  searchTerm,
  verifiedOnly = false,
}: UseSearchAccountsOptions) =>
  useQuery({
    ...authQueries.searchAccounts(searchTerm, verifiedOnly),
    ...queryConfig,
    enabled: searchTerm.length > 0 && queryConfig.enabled !== false,
  });
