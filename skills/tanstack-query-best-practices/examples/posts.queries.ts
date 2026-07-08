/**
 * src/api/post/post.queries.ts (paired with post.keys.ts below for illustration)
 *
 * Shows three patterns in one file:
 *  1. A single-entity query (`usePost`)
 *  2. A list query with `placeholderData: keepPreviousData` so filter changes don't flicker
 *  3. An infinite query sharing the feature's all() root for cross-variant invalidation
 *
 * Mutations on posts (create, update, delete) live in post.mutations.ts; they
 * invalidate via the keys defined here.
 */

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { postQueries } from "./post.keys";

import type { InfiniteQueryConfig, QueryConfig } from "../../lib/react-query";

// ---------------------------------------------------------------------------
// usePost — by id
// ---------------------------------------------------------------------------

type UsePostOptions = {
  queryConfig?: QueryConfig<typeof postQueries.post>;
};

export const usePost = (postId: string, { queryConfig = {} }: UsePostOptions = {}) =>
  useQuery({
    ...postQueries.post(postId),
    ...queryConfig,
    enabled: !!postId && queryConfig.enabled !== false,
  });

// ---------------------------------------------------------------------------
// usePosts — filterable, paginated-by-page list
// ---------------------------------------------------------------------------

type UsePostsOptions = {
  queryConfig?: QueryConfig<typeof postQueries.posts>;
  filters?: {
    authorId?: string;
    sort?: "new" | "top";
    /** Use null/undefined for "no tag filter" */
    tag?: string | null;
  };
};

export const usePosts = ({ queryConfig = {}, filters }: UsePostsOptions = {}) =>
  useQuery({
    ...postQueries.posts(filters),
    placeholderData: keepPreviousData, // avoid flicker on filter change
    staleTime: 1000 * 60 * 5,          // 5 min
    ...queryConfig,
  });

// ---------------------------------------------------------------------------
// useInfinitePosts — feed
// ---------------------------------------------------------------------------

type UseInfinitePostsOptions = {
  queryConfig?: InfiniteQueryConfig<typeof postQueries.infinitePosts>;
  filters?: { authorId?: string; sort?: "new" | "top" };
};

export const useInfinitePosts = ({
  queryConfig = {},
  filters,
}: UseInfinitePostsOptions = {}) =>
  useInfiniteQuery({
    ...postQueries.infinitePosts(filters),
    gcTime: 0, // drop paged data on unmount — feeds grow per filter
    ...queryConfig,
  });

// ---------------------------------------------------------------------------
// usePostsCount — derived metric, often shown next to filters
// ---------------------------------------------------------------------------

type UsePostsCountOptions = {
  queryConfig?: QueryConfig<typeof postQueries.postsCount>;
  filters?: { authorId?: string; tag?: string | null };
};

export const usePostsCount = ({ queryConfig = {}, filters }: UsePostsCountOptions = {}) =>
  useQuery({
    ...postQueries.postsCount(filters),
    ...queryConfig,
  });

/* -----------------------------------------------------------------------
 * For reference, the paired post.keys.ts looks like this:
 *
 * import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
 * import { fetchPost, fetchPosts, fetchPostsPage, fetchPostsCount } from "./post.requests";
 *
 * export const postQueries = {
 *   all: () => ["posts"] as const,
 *
 *   post: (id: string) =>
 *     queryOptions({
 *       queryKey: [...postQueries.all(), "detail", id],
 *       queryFn: () => fetchPost(id),
 *       enabled: !!id,
 *     }),
 *
 *   posts: (filters?: { authorId?: string; sort?: "new" | "top"; tag?: string | null }) =>
 *     queryOptions({
 *       queryKey: [...postQueries.all(), "list", filters],
 *       queryFn: () => fetchPosts(filters),
 *     }),
 *
 *   infinitePosts: (filters?: { authorId?: string; sort?: "new" | "top" }) => {
 *     const limit = 40;
 *     return infiniteQueryOptions({
 *       queryKey: [...postQueries.all(), "infinite", { filters, limit }],
 *       initialPageParam: null as { id: string; createdAt: string } | null,
 *       queryFn: ({ pageParam }) => fetchPostsPage({ limit, filters, cursor: pageParam }),
 *       getNextPageParam: (last) => {
 *         if (last.length < limit) return undefined;
 *         const tail = last[last.length - 1];
 *         return { id: tail.id, createdAt: tail.createdAt };
 *       },
 *     });
 *   },
 *
 *   postsCount: (filters?: { authorId?: string; tag?: string | null }) =>
 *     queryOptions({
 *       queryKey: [...postQueries.all(), "count", filters],
 *       queryFn: () => fetchPostsCount(filters),
 *     }),
 * };
 * --------------------------------------------------------------------- */
