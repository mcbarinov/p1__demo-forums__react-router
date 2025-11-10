import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import ky from "ky"
import { AppError } from "@/lib/errors"
import type { Forum, Post, User, LoginRequest, LoginResponse, CreateForumData, Comment, PaginatedResponse } from "@/types"
import { authStorage } from "@/lib/auth-storage"
import { navigateTo } from "@/lib/navigation"

const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

if (!baseUrl) {
  throw new Error("VITE_API_BASE_URL environment variable is required")
}

const httpClient = ky.create({
  prefixUrl: baseUrl,
  retry: 0,
  hooks: {
    beforeRequest: [
      (request) => {
        const authToken = authStorage.getAuthToken()
        if (authToken) {
          request.headers.set("Authorization", `Bearer ${authToken}`)
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        // Handle 401 authentication errors
        // Clear token and redirect to login using SPA navigation (not full page reload)
        if (response.status === 401) {
          authStorage.clearAuthToken()
          if (window.location.pathname !== "/login") {
            // Use navigateTo() instead of window.location.href to maintain SPA navigation
            // This prevents full page reload and preserves smooth user experience
            // The replace: true option prevents adding /login to browser history
            navigateTo("/login", { replace: true })
          }
        }

        if (!response.ok) {
          // Shape non-OK responses into AppError with best-effort message extraction
          const code = AppError.codeFromStatus(response.status)
          let message = `HTTP ${String(response.status)} ${response.statusText}`
          try {
            const contentType = response.headers.get("content-type")
            if (contentType?.includes("application/json")) {
              const data = (await response.clone().json()) as Record<string, unknown>
              if (typeof data.message === "string" && data.message.trim() !== "") {
                message = data.message
              }
            }
          } catch {
            // Ignore parsing errors and use fallback message
          }
          throw new AppError(code, message)
        }

        return response
      },
    ],
  },
})

export const api = {
  queries: {
    currentUser: () =>
      queryOptions({
        queryKey: ["currentUser"],
        queryFn: () => httpClient.get("api/profile").json<User>(),
        staleTime: Infinity,
        gcTime: Infinity,
      }),

    forums: () =>
      queryOptions({
        queryKey: ["forums"],
        queryFn: () => httpClient.get("api/forums").json<Forum[]>(),
        staleTime: Infinity,
        gcTime: Infinity,
      }),

    posts: (slug: string, page = 1, pageSize = 10) =>
      queryOptions({
        queryKey: ["posts", slug, page, pageSize],
        queryFn: () =>
          httpClient
            .get(`api/forums/${slug}/posts`, {
              searchParams: { page, pageSize },
            })
            .json<PaginatedResponse<Post>>(),
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
      }),

    post: (slug: string, postNumber: string) =>
      queryOptions({
        queryKey: ["post", slug, postNumber],
        queryFn: () => httpClient.get(`api/forums/${slug}/posts/${postNumber}`).json<Post>(),
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
      }),

    users: () =>
      queryOptions({
        queryKey: ["users"],
        queryFn: () => httpClient.get("api/users").json<User[]>(),
        staleTime: Infinity,
        gcTime: Infinity,
      }),

    comments: (slug: string, postNumber: string) =>
      queryOptions({
        queryKey: ["comments", slug, postNumber],
        queryFn: () => httpClient.get(`api/forums/${slug}/posts/${postNumber}/comments`).json<Comment[]>(),
        staleTime: 30 * 1000,
        gcTime: 2 * 60 * 1000,
      }),
  },

  mutations: {
    useLogin: () => {
      const queryClient = useQueryClient()

      return useMutation({
        mutationFn: (credentials: LoginRequest) => httpClient.post("api/auth/login", { json: credentials }).json<LoginResponse>(),
        onSuccess: async (response) => {
          authStorage.setAuthToken(response.authToken)
          // Invalidate and refetch all queries after login
          await queryClient.invalidateQueries()
        },
      })
    },

    useLogout: () => {
      const queryClient = useQueryClient()

      return useMutation({
        mutationFn: () => httpClient.post("api/auth/logout"),
        onSuccess: () => {
          authStorage.clearAuthToken()
          queryClient.setQueryData(["currentUser"], null)
          queryClient.clear()
        },
      })
    },

    useCreateForum: () => {
      const queryClient = useQueryClient()

      return useMutation({
        mutationFn: (data: CreateForumData) => httpClient.post("api/forums", { json: data }).json<Forum>(),
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["forums"] })
        },
      })
    },

    useCreatePost: () => {
      const queryClient = useQueryClient()

      return useMutation({
        mutationFn: ({ slug, ...data }: { title: string; content: string; tags: string[]; slug: string }) =>
          httpClient.post(`api/forums/${slug}/posts`, { json: data }).json<Post>(),
        onSuccess: (_newPost, variables) => {
          void queryClient.invalidateQueries({ queryKey: ["posts", variables.slug] })
        },
      })
    },

    useCreateComment: () => {
      const queryClient = useQueryClient()

      return useMutation({
        mutationFn: ({ slug, postNumber, content }: { slug: string; postNumber: string; content: string }) =>
          httpClient.post(`api/forums/${slug}/posts/${postNumber}/comments`, { json: { content } }).json<Comment>(),
        onSuccess: (_newComment, variables) => {
          void queryClient.invalidateQueries({ queryKey: ["comments", variables.slug, variables.postNumber] })
        },
      })
    },

    useChangePassword: () => {
      return useMutation({
        mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
          httpClient.post("api/profile/change-password", { json: { currentPassword, newPassword } }),
      })
    },
  },
}
