function joinBase(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${path}`;
}

export function registerServiceWorker(baseUrl = import.meta.env.BASE_URL): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(joinBase(baseUrl, "sw.js")).catch(() => {
      // Keep silent in MVP; offline remains best-effort.
    });
  });
}
