/**
 * src/api/auth/auth.mutations.ts
 *
 * useMutation hooks for auth. Each hook:
 * - destructures `{ onSuccess, ...rest } = mutationConfig` so the consumer's
 *   callback runs *after* our cache reconciliation,
 * - places `...rest` BEFORE `mutationFn` so consumers can't accidentally overwrite it,
 * - invalidates via `authQueries.x().queryKey` (never a literal array).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authQueries } from "./auth.keys";
import {
  loginWithEmail,
  logout,
  registerAccount,
  updateAccount,
  verifyOtp,
} from "./auth.requests";

import type { MutationConfig } from "../../lib/react-query";

// ---------------------------------------------------------------------------
// useUpdateAccount — invalidate the cached account on success
// ---------------------------------------------------------------------------

type UseUpdateAccountOptions = {
  mutationConfig?: MutationConfig<typeof updateAccount>;
};

export const useUpdateAccount = ({ mutationConfig }: UseUpdateAccountOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: authQueries.account().queryKey });
      onSuccess?.(...args);
    },
    ...rest,
    mutationFn: updateAccount,
  });
};

// ---------------------------------------------------------------------------
// useLoginWithEmail — seed the account cache from the login response
// ---------------------------------------------------------------------------

type UseLoginWithEmailOptions = {
  mutationConfig?: MutationConfig<typeof loginWithEmail>;
  saveToken: (token: string) => void; // injected — keep token persistence outside the hook
};

export const useLoginWithEmail = ({
  mutationConfig,
  saveToken,
}: UseLoginWithEmailOptions) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    onSuccess: (data, ...rest2) => {
      if (data?.token) saveToken(data.token);
      // Server-returned account → seed the cache directly (no extra round-trip).
      if (data?.account) {
        queryClient.setQueryData(authQueries.account().queryKey, data.account);
      }
      onSuccess?.(data, ...rest2);
    },
    ...rest,
    mutationFn: loginWithEmail,
  });
};

// ---------------------------------------------------------------------------
// useRegisterAccount — prefetch the account after registering
// ---------------------------------------------------------------------------

type UseRegisterAccountOptions = {
  mutationConfig?: MutationConfig<typeof registerAccount>;
  saveToken: (token: string) => void;
};

export const useRegisterAccount = ({
  mutationConfig,
  saveToken,
}: UseRegisterAccountOptions) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    onSuccess: async (data, ...rest2) => {
      if (data?.token) saveToken(data.token);
      // Cheap warm-up — the next screen wants the account.
      await queryClient.prefetchQuery(authQueries.account());
      onSuccess?.(data, ...rest2);
    },
    ...rest,
    mutationFn: registerAccount,
  });
};

// ---------------------------------------------------------------------------
// useVerifyOtp — same pattern as login
// ---------------------------------------------------------------------------

type UseVerifyOtpOptions = {
  mutationConfig?: MutationConfig<typeof verifyOtp>;
  saveToken: (token: string) => void;
};

export const useVerifyOtp = ({ mutationConfig, saveToken }: UseVerifyOtpOptions) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    onSuccess: (data, ...rest2) => {
      if (data?.token) saveToken(data.token);
      if (data?.account) {
        queryClient.setQueryData(authQueries.account().queryKey, data.account);
      }
      onSuccess?.(data, ...rest2);
    },
    ...rest,
    mutationFn: verifyOtp,
  });
};

// ---------------------------------------------------------------------------
// useLogout — clear the whole cache, not just the account
// ---------------------------------------------------------------------------

type UseLogoutOptions = {
  mutationConfig?: MutationConfig<typeof logout>;
  clearTokens: () => void;
};

export const useLogout = ({ mutationConfig, clearTokens }: UseLogoutOptions) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      // Everything keyed off the user is now invalid — easier to clear than enumerate.
      queryClient.clear();
      clearTokens();
      onSuccess?.(...args);
    },
    ...rest,
    mutationFn: logout,
  });
};
