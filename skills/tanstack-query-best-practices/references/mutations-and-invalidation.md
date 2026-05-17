# Mutations and invalidation — deep dive

Mutations are where most of the cache-related bugs come from. A query is a one-way read: it can be wrong (stale), but it can't desync. A mutation is a write that **must** keep the cache consistent with the server, and that's where things go subtly wrong.

## The standard hook shape

```ts
type UseUpdateAccountOptions = { mutationConfig?: MutationConfig<typeof updateAccount> };

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
```

Three things going on:

1. **`{ onSuccess, ...rest } = mutationConfig`** — pull the user's callback out so we can compose with ours.
2. **Our `onSuccess` runs first** — cache reconciliation is the hook's responsibility, not the consumer's.
3. **`...rest` is spread before `mutationFn`** — so a consumer can't accidentally replace the request function (or our `onSuccess`).

This shape repeats across every mutation hook. Make it muscle memory.

## Invalidate vs. setQueryData

After a write, you have two ways to update the cache:

- **`invalidateQueries`** — marks the query stale and triggers a refetch the next time it's used. Network round-trip; always returns canonical server data; safe default.
- **`setQueryData`** — overwrites the cache with what *you* provide. No network. Faster but you have to know the right shape.

Use `setQueryData` when:
- The mutation response **is** the new state of the query (server returned the updated resource).
- You're doing an optimistic update inside `onMutate`.
- You want to merge a partial update into a list without refetching the whole list.

Use `invalidateQueries` when:
- The mutation affects multiple queries you don't want to compute by hand (e.g. count + list + detail all changed).
- The server may have computed/normalized fields you can't recreate (slugs, timestamps, derived counts).
- It's a one-off action where simplicity beats latency.

A common hybrid:

```ts
onSuccess: (serverResponse, vars) => {
  // Authoritative shape for the single-item view
  queryClient.setQueryData(authQueries.account().queryKey, serverResponse);
  // Catch-all for derived views the server might have changed
  queryClient.invalidateQueries({ queryKey: authQueries.searchAccountsConstant() });
}
```

## Optimistic update lifecycle

```ts
type UpdateContext = { previous?: TreeProfile };

useMutation({
  // 1. Cancel any in-flight refetches
  onMutate: async ({ publicId, data }): Promise<UpdateContext> => {
    await queryClient.cancelQueries({ queryKey: treeQueries.tree(publicId).queryKey });

    // 2. Snapshot
    const previous = queryClient.getQueryData<TreeProfile>(treeQueries.tree(publicId).queryKey);

    // 3. Optimistic write
    if (previous) {
      queryClient.setQueryData<TreeProfile>(treeQueries.tree(publicId).queryKey, {
        ...previous,
        ...data,
      });
    }
    return { previous };
  },

  // 4. Rollback on failure
  onError: (_err, { publicId }, context) => {
    if (context?.previous) {
      queryClient.setQueryData(treeQueries.tree(publicId).queryKey, context.previous);
    }
  },

  // 5. Reconcile on success
  onSuccess: (server, { publicId }) => {
    queryClient.setQueryData(treeQueries.tree(publicId).queryKey, server);
  },

  // 6. Optional: refetch related lists either way
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: treeQueries.treesList() });
  },

  mutationFn: updateTreeInfo,
});
```

The steps in order:

1. **Cancel** — `cancelQueries` stops any refetch already in flight that could overwrite your optimistic data when it lands. Forget this step and you'll see "the UI updated then bounced back" bugs that only reproduce on slow networks.
2. **Snapshot** — `getQueryData` captures the pre-write state so you can roll back. Return it from `onMutate` as `context` — TanStack passes it into `onError`.
3. **Optimistic write** — `setQueryData` flips the cache to the predicted new state. Pure / synchronous; no `await`.
4. **Rollback** — on failure, restore the snapshot. If the snapshot was `undefined` (query wasn't cached), you can either remove the key entirely or just no-op.
5. **Reconcile** — on success, replace the cache with what the server actually returned. This catches server-side mutations to the data shape (computed fields, normalized values).
6. **Refetch related** — `onSettled` runs after both `onSuccess` and `onError`, so it's the right place for "always refetch the lists this might have affected."

### When to skip optimistic updates

- **Server returns a new id** that immediately needs to be navigated to or referenced — you can't predict it.
- **Response shape has many computed fields** (running totals, slugs, timestamps, server-normalized strings).
- **The mutation is rare and slow** — invalidation is simpler and the UI lag isn't noticed.
- **You're learning** — invalidation works fine for most cases; reach for optimistic when you've shipped without it and the latency feels bad.

## Updating cached lists from a mutation

A mutation that updates one item often needs to also refresh the lists that contain it. Options:

```ts
// A. Just invalidate
queryClient.invalidateQueries({ queryKey: postQueries.postsList() });

// B. Surgical patch — only when you trust the response shape exactly
queryClient.setQueryData<Post[]>(postQueries.postsList(), (old) =>
  old?.map((p) => (p.id === updated.id ? updated : p))
);

// C. Surgical patch on infinite queries — same idea, walk pages
queryClient.setQueryData<InfiniteData<Post[]>>(postQueries.infinitePostsConstant(), (old) => {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) =>
      page.map((p) => (p.id === updated.id ? updated : p))
    ),
  };
});
```

**Heuristic:** Start with (A). Move to (B) or (C) only if you can measure that the refetch is causing perceptible lag.

## Cross-feature invalidation

When one feature's mutation affects another feature's data, import the other feature's keys directly and invalidate:

```ts
// gift/gift.mutations.ts
import { treeQueries } from "../tree";

onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: giftQueries.giftBatches() });
  queryClient.invalidateQueries({ queryKey: treeQueries.treesList() }); // gifts affect tree lists
}
```

That coupling is fine — it's explicit, type-checked, and grep-able. The alternative (broadcast events / pub-sub) is worse: it hides which mutation invalidates what, and the relationship breaks silently when a key changes.

## `useMutationState` for cross-component status

If a component needs to know "is *any* `useUpdateAccount` mutation in flight right now?" (e.g. show a spinner in a header), use `useMutationState` instead of lifting the mutation up:

```ts
import { useMutationState } from "@tanstack/react-query";

const pendingUpdates = useMutationState({
  filters: { mutationKey: ["updateAccount"], status: "pending" },
});
const isUpdating = pendingUpdates.length > 0;
```

Requires that you set `mutationKey` on the `useMutation` call (`mutationKey: ["updateAccount"]`). Same factory-style discipline applies — keep mutation keys in a `<feature>.keys.ts` if you start using them in multiple places.

## Anti-patterns

```ts
// ❌ Spreading mutationConfig raw — consumer's onSuccess wins, cache never invalidates
useMutation({ ...mutationConfig, mutationFn: updateAccount });

// ❌ Stringly-typed invalidate — silent break on rename
queryClient.invalidateQueries({ queryKey: ["account"] });

// ❌ Optimistic write without cancelQueries — race condition with in-flight refetch
onMutate: () => queryClient.setQueryData(key, newData),

// ❌ Optimistic update without snapshot — no rollback on error
onMutate: ({ data }) => { queryClient.setQueryData(key, data); },

// ❌ mutationFn placed before ...rest — consumer can overwrite it
useMutation({ mutationFn: updateAccount, ...mutationConfig });
```
