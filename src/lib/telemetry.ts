import { getTelemetryOptIn, logTelemetryEvent } from "./db";
import type { TelemetryEvent } from "../types/contracts";

export async function track(
  name: TelemetryEvent["name"],
  payload: TelemetryEvent["payload"]
): Promise<void> {
  const optIn = await getTelemetryOptIn();
  if (!optIn) {
    return;
  }
  await logTelemetryEvent({ name, payload, ts: Date.now() });
}
