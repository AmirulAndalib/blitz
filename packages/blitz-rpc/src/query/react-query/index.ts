import {QueryClient} from "@tanstack/query-core"
import type {DefaultOptions} from "@tanstack/react-query"
import {createClientPlugin} from "blitz"
import BlitzProvider, {BlitzProviderType} from "../react-query/provider"
import {dehydrate} from "@tanstack/query-core"

export * from "./react-query"
export {
  getQueryKey,
  getInfiniteQueryKey,
  invalidateQuery,
  setQueryData,
  getQueryClient,
  getQueryData,
} from "../utils"

export {BlitzProvider, dehydrate, QueryClient}

export type {HydrateOptions, DefaultOptions} from "@tanstack/react-query"

interface BlitzRpcOptions {
  reactQueryOptions?: DefaultOptions
}

export const BlitzRpcPlugin = createClientPlugin<
  BlitzRpcOptions,
  {queryClient: QueryClient; BlitzProvider: BlitzProviderType}
>((options?: BlitzRpcOptions) => {
  const initializeQueryClient = () => {
    const {reactQueryOptions} = options || {}
    return new QueryClient({
      defaultOptions: {
        ...reactQueryOptions,
        queries: {
          ...(typeof window === "undefined" && {cacheTime: 0}),
          retry: (failureCount: number, error: any) => {
            if (process.env.NODE_ENV !== "production") return false

            // Retry (max. 3 times) only if network error detected
            if (error.message === "Network request failed" && failureCount <= 3) return true

            return false
          },
          ...reactQueryOptions?.queries,
        },
      },
    })
  }
  const queryClient = initializeQueryClient()
  function resetQueryClient() {
    setTimeout(async () => {
      // Do these in the next tick to prevent various bugs like https://github.com/blitz-js/blitz/issues/2207
      const debug = (await import("debug")).default("blitz:rpc")
      debug("Invalidating react-query cache...")
      await queryClient.cancelQueries()
      await queryClient.resetQueries()
      queryClient.getMutationCache().clear()
      // We have a 100ms delay here to prevent unnecessary stale queries from running
      // This prevents the case where you logout on a page with
      // Page.authenticate = {redirectTo: '/login'}
      // Without this delay, queries that require authentication on the original page
      // will still run (but fail because you are now logged out)
      // Ref: https://github.com/blitz-js/blitz/issues/1935
    }, 100)
  }
  globalThis.queryClient = queryClient
  return {
    events: {
      onSessionCreated: async () => {
        resetQueryClient()
      },
    },
    middleware: {},
    exports: () => ({
      queryClient,
      BlitzProvider,
    }),
  }
})
