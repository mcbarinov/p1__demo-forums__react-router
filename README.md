# DemoForums

An architectural template for React SPAs with REST APIs, showcasing production-ready patterns for state management, caching, error handling, and component organization.

## Routes

All available routes in the application:

```
/login                          Login page (public)

/                               Forum list / Home page (protected)
/forums/new                     Create new forum (protected)
/forums/:slug                   Post list for specific forum (protected)
/forums/:slug/new               Create new post in forum (protected)
/forums/:slug/:postNumber       View post with comments (protected)
```

**Examples with real data:**

```
/login                                  Login page (public)

/                                       Forum list (protected)
/forums/new                             Create forum form (protected)
/forums/web-development                 Posts in "web-development" forum (protected)
/forums/web-development/new             Create post in "web-development" (protected)
/forums/web-development/42              View post #42 in "web-development" (protected)
```

**Protection details:**

- **Public routes**: `/login` - accessible without authentication
- **Protected routes**: All other routes - wrapped in `Layout` component which acts as auth guard

## Architecture

### Project Structure

```
src/
├── components/
│   ├── pages/                 # Page components
│   │   ├── post-list/         # Complex page with sub-components
│   │   │   ├── PostListPage.tsx
│   │   │   └── -components/   # Internal components (- prefix)
│   │   │       └── Paginator.tsx
│   │   ├── post-view/         # Another complex page
│   │   │   ├── PostViewPage.tsx
│   │   │   └── -components/
│   │   │       ├── PostDetail.tsx
│   │   │       ├── CommentForm.tsx
│   │   │       └── CommentList.tsx
│   │   └── LoginPage.tsx      # Simple page without sub-components
│   ├── layouts/               # Layout components
│   │   ├── Layout.tsx
│   │   └── -components/       # Layout sub-components
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── ChangePasswordDialog.tsx
│   ├── ui/                    # UI components (shadcn/ui)
│   ├── shared/                # Reusable components
│   │   ├── Username.tsx
│   │   └── ErrorMessage.tsx
│   └── errors/                # Error handling components
│       └── ErrorBoundary.tsx
├── lib/                       # Core utilities
│   ├── api.ts                # API client and cache configuration
│   ├── errors.ts             # Error handling system
│   ├── formatters.ts         # Data formatting utilities
│   ├── navigation.ts         # Navigation utilities
│   └── utils.ts              # UI utility functions (shadcn/ui)
├── hooks/                     # Custom React hooks
│   └── useCache.ts           # Cache access hooks
├── types.ts                   # TypeScript type definitions
├── router.ts                  # Route configuration
└── main.tsx                   # Application entry point
```

### API Layer and State Management

The API layer follows a clear separation of concerns:

#### `lib/api.ts` - Centralized API Client

This file is the heart of all server communication:

**HTTP Client Configuration:**

- Configures `ky` HTTP client with base URL and interceptors
- Automatically sends HttpOnly cookies with all requests (`credentials: "include"`)
- Handles 401 errors with redirect to login (only when not on login page)
- Excludes 401 from retry attempts to prevent multiple failed auth requests
- Transforms HTTP errors into standardized `AppError` instances

**Query & Mutation Definitions:**

- Defines all TanStack Query queries and mutations
- Sets intelligent cache strategies based on data volatility
- Manages query keys for cache invalidation
- Provides type-safe API methods

**Key Responsibilities:**

- HTTP request/response processing
- Error transformation and standardization
- Automatic cookie transmission for authentication
- Cache configuration (staleTime, gcTime)
- Query key management

**What it DOESN'T do:**

- UI updates or navigation (handled by components)\*
- Business logic (handled by components)
- Direct error display (components show toasts/errors)

\*Exception: 401 authentication errors trigger automatic redirect to `/login` at the API layer to ensure consistent auth handling across the entire application

```typescript
// Example: Complete API configuration with auth, error handling, and caching
const httpClient = ky.create({
  prefixUrl: baseUrl,  // Configured via VITE_API_BASE_URL environment variable
  credentials: "include",  // Send HttpOnly cookies with every request
  hooks: {
    afterResponse: [async (request, options, response) => {
      if (response.status === 401) {
        // Cookie is HttpOnly, cannot be accessed by JavaScript
        // Redirect to login for re-authentication
        navigateTo("/login", { replace: true })
      }
      if (!response.ok) {
        throw new AppError(...)
      }
    }]
  }
})

// Query with intelligent caching
queries: {
  forums: () =>
    queryOptions({
      queryKey: ["forums"],
      queryFn: () => httpClient.get("api/forums").json<Forum[]>(),
      staleTime: Infinity,  // Static data - never refetch
      gcTime: Infinity,     // Keep in cache forever
    }),
}
```

#### Components - UI Logic and Navigation

- Handle error states and display
- Manage navigation after mutations
- Show loading states via Suspense
- Display toast notifications

```typescript
// Example: Component handles navigation after success
const mutation = api.mutations.useCreatePost()
mutation.mutate(data, {
  onSuccess: (post) => {
    navigate(`/forums/${post.forumSlug}/${post.number}`)
  },
  onError: (error) => {
    toast.error(AppError.fromUnknown(error).message)
  },
})
```

### Page Component Organization

#### Naming Conventions

- Page components: `[PageName]Page.tsx` (e.g., `LoginPage.tsx`, `PostListPage.tsx`)
- Sub-components: Stored in `-components/` folder with `-` prefix
- File structure mirrors component complexity

#### Page Types

1. **Simple Pages** - Single file

   ```
   components/pages/LoginPage.tsx
   ```

2. **Complex Pages** - Folder with sub-components
   ```
   components/pages/post-list/
   ├── PostListPage.tsx
   └── -components/
       └── Paginator.tsx
   ```

### Caching Strategy

The application implements intelligent caching based on data volatility:

#### Static Data (Cached Indefinitely)

- **Forums list** - Rarely changes
- **Users list** - Stable reference data
- Strategy: `staleTime: Infinity, gcTime: Infinity`
- Loaded once at app start, never refetched

#### Dynamic Data (Time-based Cache)

- **Posts** - Moderate update frequency
  - `staleTime: 1 minute, gcTime: 5 minutes`
- **Comments** - High update frequency
  - `staleTime: 30 seconds, gcTime: 2 minutes`

#### Cache Access Pattern

Custom hooks in `hooks/useCache.ts` provide typed access to cached data:

```typescript
// Access cached forums without network request
const forum = useForum(slug) // Throws if not found
const forums = useForums() // Returns all forums
```

### Form Handling

**Technology Stack:** React Hook Form + Zod + shadcn/ui + TanStack Query mutations

**Form Pattern:**

```typescript
// 1. Define schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
})
type FormData = z.infer<typeof formSchema>

// 2. Complete form component
export function CreatePostForm() {
  const navigate = useNavigate()
  const mutation = api.mutations.useCreatePost()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", content: "" },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data, {
      onSuccess: (post) => {
        toast.success("Post created!")
        navigate(`/posts/${post.id}`)
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mutation.error && <ErrorMessage error={mutation.error} />}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create"}
        </Button>
      </form>
    </Form>
  )
}
```

**Key Rules:**
- Display errors in UI with `{mutation.error && <ErrorMessage error={mutation.error} />}` - never use `onError` callbacks
- Handle navigation/toasts in `onSuccess` callback
- Show loading state with `disabled={mutation.isPending}`
- Use `z.infer` for type safety

### Error Handling

#### Centralized Error System

- `AppError` class standardizes error handling
- Automatic HTTP error transformation
- Type-safe error codes

#### Error Flow

1. API errors caught in `api.ts` afterResponse hook
2. Transformed to `AppError` with appropriate code
3. Components handle via:
   - Error boundaries for render errors
   - Toast notifications for mutations
   - Error displays for query failures

#### Authentication Errors

- 401 responses trigger automatic redirect to `/login`
- Redirect only happens when not already on login page
- No retry attempts for 401 errors (fail immediately)
- Query cache cleared to prevent stale data

### Authentication & Security

This project uses **HttpOnly cookies** for authentication, providing better security against XSS attacks compared to localStorage.

**Key Benefits:**
- **XSS Protection**: HttpOnly cookies cannot be accessed by JavaScript
- **Automatic Transmission**: Browser sends cookies automatically with requests
- **CSRF Protection**: SameSite=Lax prevents cross-site cookie transmission

**Authentication Flow:**

1. **Login**: Backend sets HttpOnly, Secure, SameSite=Lax cookie
2. **Requests**: Browser automatically includes cookie (using `credentials: "include"`)
3. **Validation**: Backend validates session from cookie
4. **Logout**: Backend expires cookie
5. **Auth Guard**: Layout component queries `/api/profile` - 401 redirects to login

**Security Configuration:**

```python
# Backend (FastAPI)
SECURE_COOKIES = os.getenv("ENVIRONMENT") == "production"

response.set_cookie(
    key="session_id",
    value=session_id,
    httponly=True,        # XSS protection
    secure=SECURE_COOKIES,  # HTTPS-only in production
    samesite="lax",       # CSRF protection
)
```

```typescript
// Frontend (ky)
const httpClient = ky.create({
  credentials: "include", // Send cookies with requests
})
```

**Important Considerations:**
- CORS requires `allow_credentials=True`
- Session state in backend memory (use external store for horizontal scaling)
- Set `ENVIRONMENT=production` for secure cookies in production
- In production, reverse proxy (Caddy/Nginx) handles SSL termination

## Key Development Principles

### 1. Minimize Network Requests

- Aggressive caching for static data
- Strategic cache invalidation
- Prefetch critical data on app start

### 2. Clear Separation of Concerns

- API layer: Cache management only
- Components: UI logic and user interaction
- Hooks: Reusable data access patterns
- Lib: Core utilities and configuration

### 3. Type Safety

- Full TypeScript coverage
- Typed route parameters: `as { slug: string }`
- Type-safe API responses
- Zod validation for forms

### 4. Error Resilience

- Graceful error handling at all levels
- User-friendly error messages
- Automatic recovery mechanisms
- Comprehensive error logging

### 5. Developer Experience

- Separate dev commands for humans vs AI agents
- Clear file organization
- Consistent naming patterns

## Development

### Prerequisites

- Node.js 18+
- pnpm package manager
- Python 3.14+ and uv (for backend API)
- **Backend API**: This project requires the FastAPI backend to be running
  - Repository: https://github.com/mcbarinov/p1__demo-forums__api
  - By default, the backend should run on `http://localhost:8000` (configurable via `VITE_API_BASE_URL`)

### Backend Setup

Before running the frontend, you need to start the backend API:

```bash
# Clone the backend repository
git clone https://github.com/mcbarinov/p1__demo-forums__api.git
cd p1__demo-forums__api

# Install dependencies and start the server
uv sync
uv run uvicorn api:app --reload

# Backend will be available at http://localhost:8000
# API documentation at http://localhost:8000/docs
```

### Environment Variables

The project uses environment variables for configuration. Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

**Available variables:**

- `VITE_API_BASE_URL` - Backend API server endpoint (default: `http://localhost:8000` in development)

**For different environments:**

```bash
# Development (default)
VITE_API_BASE_URL=http://localhost:8000

# Staging
VITE_API_BASE_URL=https://staging-api.example.com

# Production
VITE_API_BASE_URL=https://api.example.com
```

**Note**: Environment variables prefixed with `VITE_` are embedded at build time and exposed to the client-side code.

### Frontend Setup

```bash
# Install dependencies
pnpm install

# Start development server (for developers)
pnpm dev

# Start development server (for AI agents)
pnpm agent-dev
```

**Note**: Make sure the backend API is running before starting the frontend.

### Key Technologies

- **React 19** - UI framework
- **React Query (TanStack Query)** - Server state management
- **React Router** - Client-side routing
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Ky** - HTTP client
- **Zod** - Schema validation
- **React Hook Form** - Form management

### Development Features

- **Hot Reload** - Instant feedback during development
- **Type Checking** - Catch errors at compile time
- **Error Boundaries** - Graceful error recovery

## Best Practices

### Component Props

**Inline types** for 1-3 simple properties:
```typescript
export function ErrorMessage({ error }: { error: unknown }) {}
export function Username({ id, className }: { id: string; className?: string }) {}
```

**Interfaces** for 4+ properties or JSDoc needs:
```typescript
interface PaginatorProps {
  currentPage: number
  totalPages: number
  pageSize: number
}
export function Paginator(props: PaginatorProps) {}
```

Never export prop interfaces unless reused elsewhere.

### Common Patterns

**New Page:** Add route in `router.ts` → Create in `components/pages/` → Use `-components/` for sub-components

**New API:** Define types in `types.ts` → Add query/mutation in `api.ts` → Set cache strategy

**Cached Data:** Use `useCache` hooks → Throw `AppError` for missing data → Let ErrorBoundary handle failures

## Project Setup from Scratch

Complete script to recreate this project from zero:

```bash
# Create project
pnpm create vite@latest -t react-ts {new-project-dir}
cd {new-project-dir}

# Core dependencies
pnpm add react-router ky @tanstack/react-query

# Dev tools
pnpm add -D eslint-plugin-react-x eslint-plugin-react-dom prettier eslint-config-prettier @types/node @tanstack/eslint-plugin-query

# Tailwind CSS (not as dev dependency!)
pnpm add tailwindcss @tailwindcss/vite
echo '@import "tailwindcss";' > src/index.css

# shadcn/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add dropdown-menu card table form button textarea input select sonner badge pagination alert dialog
```
