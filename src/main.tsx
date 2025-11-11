import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "./index.css"
import { RouterProvider } from "react-router"
import { createRouter } from "@/router"
import { toast } from "sonner"
import { AppError } from "@/lib/errors"
import { Toaster } from "@/components/ui/sonner"
import { setNavigate } from "@/lib/navigation"

function startApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const appError = AppError.fromUnknown(error)

          // Never retry client errors (won't succeed anyway)
          if (["unauthorized", "forbidden", "not_found", "bad_request", "validation"].includes(appError.code)) {
            return false
          }

          // Retry transient failures (server errors, network issues) up to 3 times
          if (["server_error", "network_error"].includes(appError.code)) {
            return failureCount < 3
          }

          return false
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Only show error toasts for background refetches when there's existing data
        // This prevents duplicate error notifications on initial load
        if (query.state.data !== undefined) {
          const appError = AppError.fromUnknown(error)
          toast.error(appError.message)
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        // Log all mutation errors for monitoring
        const appError = AppError.fromUnknown(error)
        console.error("Mutation error:", appError)
      },
    }),
  })

  const router = createRouter(queryClient)

  // Initialize navigation gateway to enable SPA navigation from non-React code
  // This allows api.ts to redirect to /login on 401 without full page reload
  setNavigate((path, opts) => {
    void router.navigate(path, { replace: opts?.replace })
  })

  const rootElement = document.getElementById("root")
  if (!rootElement) throw new Error("Root element not found")

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </StrictMode>
  )
}

startApp()
