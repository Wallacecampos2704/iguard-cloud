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

export const DEVICES_URL = `${process.env.API_URL ?? "http://localhost:4000"}/devices`;

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
    const response = await fetch(DEVICES_URL, {
      cache: "no-store",
    });

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
