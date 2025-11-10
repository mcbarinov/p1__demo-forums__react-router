/**
 * Navigation Gateway
 *
 * This module provides a bridge between plain JavaScript modules (like api.ts)
 * and React Router, enabling SPA navigation from non-React code.
 *
 * Problem it solves:
 * - api.ts needs to redirect to /login on 401 errors
 * - api.ts is a plain module, not a React component
 * - Can't use React hooks (useNavigate) in plain modules
 * - Using window.location.href causes full page reload (not SPA-like)
 *
 * How it works:
 * 1. main.tsx calls setNavigate() after creating router
 * 2. navigateTo() can now be called from any module
 * 3. Internally uses router.navigate() for smooth SPA navigation
 *
 * Alternative approaches considered:
 * - Pass router as parameter to api.ts: Too invasive, changes all signatures
 * - Move auth handling to React layer: Major architectural change
 * - Keep window.location.href: Works but breaks SPA experience
 */

type NavigateFn = (path: string, opts?: { replace?: boolean }) => void

let navigateRef: NavigateFn | null = null

/**
 * Initialize navigation gateway with router's navigate function.
 * Must be called once during app startup after router creation.
 *
 * @param fn - Function that performs navigation (typically router.navigate)
 */
export function setNavigate(fn: NavigateFn) {
  navigateRef = fn
}

/**
 * Navigate to a path using SPA navigation if available, fallback to window.location.
 *
 * This function can be called from any module, including non-React code.
 * It will use React Router's navigate if initialized, or fall back to full page reload.
 *
 * @param path - The path to navigate to (e.g., "/login")
 * @param opts - Navigation options
 * @param opts.replace - If true, replaces current history entry instead of pushing
 */
export function navigateTo(path: string, opts?: { replace?: boolean }) {
  if (!navigateRef) {
    // Fallback for edge case where navigateTo is called before setNavigate
    // This shouldn't happen in normal flow, but provides graceful degradation
    console.warn("navigateTo called before setNavigate - falling back to window.location")
    window.location.href = path
    return
  }
  navigateRef(path, opts)
}
