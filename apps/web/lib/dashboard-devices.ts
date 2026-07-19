import { authenticatedApiFetch } from "@/lib/api-auth";

export type ApiDeviceStatus =
  | "ONLINE"
  | "WARNING"
  | "OFFLINE"
  | "UNKNOWN"
  | "MAINTENANCE";

export interface DashboardDevice {
  id: string;
  name: string;
  deviceType: string;
  host: string;
  port: number | null;
  checkType: string;
  currentStatus: ApiDeviceStatus;
  responseTimeMs: number | null;
  lastCheckedAt: string | null;
  customerName: string;
  siteName: string;
}

export interface DashboardDevicesResult {
  data: DashboardDevice[];
  hasError: boolean;
}

function isDeviceStatus(value: unknown): value is ApiDeviceStatus {
  return (
    value === "ONLINE" ||
    value === "WARNING" ||
    value === "OFFLINE" ||
    value === "UNKNOWN" ||
    value === "MAINTENANCE"
  );
}

function toDevice(value: Partial<DashboardDevice>): DashboardDevice | null {
  if (typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    deviceType: typeof value.deviceType === "string" ? value.deviceType : "OTHER",
    host: typeof value.host === "string" ? value.host : "",
    port: typeof value.port === "number" ? value.port : null,
    checkType: typeof value.checkType === "string" ? value.checkType : "HTTP",
    currentStatus: isDeviceStatus(value.currentStatus)
      ? value.currentStatus
      : "UNKNOWN",
    responseTimeMs:
      typeof value.responseTimeMs === "number" ? value.responseTimeMs : null,
    lastCheckedAt:
      typeof value.lastCheckedAt === "string" ? value.lastCheckedAt : null,
    customerName:
      typeof value.customerName === "string" ? value.customerName : "Sem cliente",
    siteName: typeof value.siteName === "string" ? value.siteName : "Sem local",
  };
}

function isDashboardDevice(
  device: DashboardDevice | null,
): device is DashboardDevice {
  return device !== null;
}

export async function getDashboardDevices(): Promise<DashboardDevicesResult> {
  try {
    const result = await authenticatedApiFetch("/devices", {
      cache: "no-store",
    });

    if (!result.ok) {
      return { data: [], hasError: true };
    }

    const { response } = result;

    if (!response.ok) {
      return { data: [], hasError: true };
    }

    const devices = (await response.json()) as Partial<DashboardDevice>[];

    return {
      data: Array.isArray(devices)
        ? devices.map(toDevice).filter(isDashboardDevice)
        : [],
      hasError: false,
    };
  } catch {
    return { data: [], hasError: true };
  }
}
