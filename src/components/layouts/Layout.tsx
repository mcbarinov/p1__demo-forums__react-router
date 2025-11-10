import { Suspense } from "react"
import { Navigate, Outlet, useLocation } from "react-router"
import Footer from "./-components/Footer"
import Header from "./-components/Header"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ErrorBoundary } from "@/components/errors/ErrorBoundary"

export default function Layout() {
  const location = useLocation()
  const { data: currentUser, isPending } = useQuery({
    ...api.queries.currentUser(),
    enabled: location.pathname !== "/login",
  })

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  return (
    <div className="min-h-screen flex flex-col mx-auto w-full max-w-4xl px-6">
      <Header />

      <main className="flex-1 py-6">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense
            fallback={
              <div className="container mx-auto py-8">
                <div className="text-center">Loading...</div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  )
}
