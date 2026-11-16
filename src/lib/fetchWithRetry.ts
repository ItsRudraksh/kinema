export async function fetchJsonWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxAttempts = 3,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error("Request failed");
      if (attempt < maxAttempts) {
        const delayMs = 220 * attempt;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}
