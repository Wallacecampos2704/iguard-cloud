export interface DashboardSummary {
  totalDevices: number;
  devicesOnline: number;
  devicesWarning: number;
  devicesOffline: number;
  openIncidents: number;
  criticalIncidents: number;
  notificationContacts: number;
  trialSubscriptions: number;
  pendingPayments: number;
  approvedPayments: number;
  totalApprovedAmount: number;
  platformHealthScore: number;
  lastCheckedAt: string | null;
}

export interface DashboardSummaryResult {
  data: DashboardSummary;
  hasError: boolean;
}

const DASHBOARD_SUMMARY_URL = `${process.env.API_URL ?? "http://localhost:4000"}/dashboard/summary`;

export const emptyDashboardSummary: DashboardSummary = {
  totalDevices: 0,
  devicesOnline: 0,
  devicesWarning: 0,
  devicesOffline: 0,
  openIncidents: 0,
  criticalIncidents: 0,
  notificationContacts: 0,
  trialSubscriptions: 0,
  pendingPayments: 0,
  approvedPayments: 0,
  totalApprovedAmount: 0,
  platformHealthScore: 0,
  lastCheckedAt: null,
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function getDashboardSummary(): Promise<DashboardSummaryResult> {
  try {
    const response = await fetch(DASHBOARD_SUMMARY_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { data: emptyDashboardSummary, hasError: true };
    }

    const summary = (await response.json()) as Partial<DashboardSummary>;

    return {
      data: {
        totalDevices: toNumber(summary.totalDevices),
        devicesOnline: toNumber(summary.devicesOnline),
        devicesWarning: toNumber(summary.devicesWarning),
        devicesOffline: toNumber(summary.devicesOffline),
        openIncidents: toNumber(summary.openIncidents),
        criticalIncidents: toNumber(summary.criticalIncidents),
        notificationContacts: toNumber(summary.notificationContacts),
        trialSubscriptions: toNumber(summary.trialSubscriptions),
        pendingPayments: toNumber(summary.pendingPayments),
        approvedPayments: toNumber(summary.approvedPayments),
        totalApprovedAmount: toNumber(summary.totalApprovedAmount),
        platformHealthScore: toNumber(summary.platformHealthScore),
        lastCheckedAt:
          typeof summary.lastCheckedAt === "string" ? summary.lastCheckedAt : null,
      },
      hasError: false,
    };
  } catch {
    return { data: emptyDashboardSummary, hasError: true };
  }
}
