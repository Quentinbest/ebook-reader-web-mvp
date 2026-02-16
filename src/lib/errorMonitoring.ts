import { track } from "./telemetry";

let initialized = false;

export function installGlobalErrorMonitoring(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  window.addEventListener("error", (event) => {
    void track("app_error", {
      kind: "error",
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    void track("app_error", {
      kind: "unhandledrejection",
      message: reason instanceof Error ? reason.message : String(reason)
    });
  });
}
