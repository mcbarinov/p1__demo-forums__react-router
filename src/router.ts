import { createBrowserRouter } from "react-router"
import { type QueryClient } from "@tanstack/react-query"
import ForumListPage from "@/components/pages/ForumListPage"
import LoginPage from "@/components/pages/LoginPage"
import Layout from "@/components/layouts/Layout"
import PostListPage from "@/components/pages/post-list/PostListPage"
import ForumCreatePage from "@/components/pages/ForumCreatePage"
import PostCreatePage from "@/components/pages/PostCreatePage"
import PostViewPage from "@/components/pages/post-view/PostViewPage"
import { api } from "@/lib/api"

async function layoutLoader({ queryClient }: { queryClient: QueryClient }) {
  await Promise.all([
    queryClient.prefetchQuery(api.queries.currentUser()),
    queryClient.prefetchQuery(api.queries.forums()),
    queryClient.prefetchQuery(api.queries.users()),
  ])

  return null
}

export const createRouter = (queryClient: QueryClient) => {
  const router = createBrowserRouter([
    {
      path: "/login",
      Component: LoginPage,
    },
    {
      path: "/",
      Component: Layout,
      loader: () => layoutLoader({ queryClient }),
      children: [
        {
          index: true,
          Component: ForumListPage,
        },
        {
          path: "forums/new",
          Component: ForumCreatePage,
        },
        {
          path: "forums/:slug",
          Component: PostListPage,
        },
        {
          path: "forums/:slug/new",
          Component: PostCreatePage,
        },
        {
          path: "forums/:slug/:postNumber",
          Component: PostViewPage,
        },
      ],
    },
  ])

  return router
}
