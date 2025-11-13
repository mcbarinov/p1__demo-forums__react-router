import type { components } from "./openapi.gen"

export type { paths, components } from "./openapi.gen"

export type Category = "Technology" | "Science" | "Art"
export type Role = "admin" | "user"

export type User = components["schemas"]["User"]
export type Forum = components["schemas"]["Forum"]
export type Post = components["schemas"]["Post"]
export type Comment = components["schemas"]["Comment"]

export type LoginRequest = components["schemas"]["LoginRequest"]
export type LoginResponse = components["schemas"]["LoginResponse"]
export type ChangePasswordRequest = components["schemas"]["ChangePasswordRequest"]

export type CreateForumRequest = components["schemas"]["CreateForumRequest"]
export type CreatePostRequest = components["schemas"]["CreatePostRequest"]
export type CreateCommentRequest = components["schemas"]["CreateCommentRequest"]

export type ErrorResponse = components["schemas"]["ErrorResponse"]
export type MessageResponse = components["schemas"]["MessageResponse"]
export type ValidationError = components["schemas"]["ValidationError"]
export type HTTPValidationError = components["schemas"]["HTTPValidationError"]

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export type PaginatedPostResponse = components["schemas"]["PaginatedResponse_Post_"]
