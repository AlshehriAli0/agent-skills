/**
 * src/api/auth/auth.requests.ts
 *
 * The only place network calls for the auth feature live.
 * - Every function is typed (return type inferred, body typed if it takes one).
 * - Hooks consume these via `<feature>.keys.ts` and `<feature>.mutations.ts`.
 * - Never call `fetch` / `axios` from a component or a hook directly.
 */

import { api } from "../../lib/axios"; // your wrapped axios/fetch client

import type {
  AccountProfile,
  AccountCard,
  AccountMinimalInfo,
  LoginEmailFields,
  LoginEmailResponse,
  RegisterFields,
  RegisterResponse,
  SearchedAccount,
  UpdateAccountFields,
  VerifyOtpFields,
  VerifyOtpResponse,
} from "./auth.types";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const fetchAccount = async () => {
  const res = await api.get<AccountProfile>("/account");
  return res.data.data;
};

export const fetchAccountMinimalInfo = async (accountId?: number) => {
  if (!accountId) throw new Error("accountId is required");
  const res = await api.get<AccountMinimalInfo>(`/account/${accountId}/minimal`);
  return res.data.data;
};

export const fetchAccountCard = async (encryptedPhone: string) => {
  const res = await api.get<AccountCard>(`/account/card/${encryptedPhone}`);
  return res.data.data;
};

export const searchAccounts = async (term: string, verifiedOnly?: boolean) => {
  const res = await api.get<SearchedAccount[]>("/accounts/search", {
    params: { term, verifiedOnly },
  });
  return res.data.data;
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const updateAccount = async (data: UpdateAccountFields) => {
  const res = await api.patch<AccountProfile>("/account", data);
  return res.data.data;
};

export const loginWithEmail = async (fields: LoginEmailFields) => {
  const res = await api.post<LoginEmailResponse>("/auth/login_email", fields);
  return res.data.data;
};

export const registerAccount = async (fields: RegisterFields) => {
  const res = await api.post<RegisterResponse>("/auth/register", fields);
  return res.data.data;
};

export const verifyOtp = async (data: VerifyOtpFields) => {
  const res = await api.post<VerifyOtpResponse>("/auth/verify_otp", data);
  return res.data.data;
};

export const logout = async () => {
  await api.post("/auth/logout");
};
