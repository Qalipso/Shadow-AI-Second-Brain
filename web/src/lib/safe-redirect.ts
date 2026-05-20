/**
 * Returns a safe internal redirect path or the fallback.
 *
 * Rejects:
 * - non-string input
 * - empty string
 * - anything not starting with "/"
 * - protocol-relative URLs ("//host", "/\\host")
 * - absolute URLs containing a scheme ("http:", "javascript:")
 * - whitespace / control chars
 *
 * Use everywhere a `next` / `redirect_to` value enters a redirect call.
 *
 * Examples (placeholder host shown — never link a real external domain):
 *   safeRedirect("/dashboard")             // "/dashboard"
 *   safeRedirect("/inbox/abc")             // "/inbox/abc"
 *   safeRedirect("//external.invalid")     // "/dashboard"  (protocol-relative)
 *   safeRedirect("/\\external.invalid")    // "/dashboard"  (backslash variant)
 *   safeRedirect("https://external.invalid") // "/dashboard"  (does not start with "/")
 *   safeRedirect("javascript:alert(1)")    // "/dashboard"  (does not start with "/")
 *   safeRedirect(null)                     // "/dashboard"
 *   safeRedirect("")                       // "/dashboard"
 *   safeRedirect("/foo", "/login")         // "/foo"
 *   safeRedirect("bad", "/login")          // "/login"
 */
export function safeRedirect(
  input: unknown,
  fallback: string = "/dashboard",
): string {
  if (typeof input !== "string") return fallback;
  if (input.length === 0) return fallback;

  // Reject control chars + whitespace (newline-smuggling, header-injection).
  // eslint-disable-next-line no-control-regex
  if (/[\s\x00-\x1f\x7f]/.test(input)) return fallback;

  // Must be a path: starts with single "/" and not "//" or "/\".
  // "//host" and "/\\host" are both treated as protocol-relative by browsers.
  if (input[0] !== "/") return fallback;
  if (input[1] === "/" || input[1] === "\\") return fallback;

  return input;
}
