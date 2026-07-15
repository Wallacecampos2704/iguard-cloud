export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type IncidentRelation = {
  id: string;
  name: string;
};

export type IncidentDevice = IncidentRelation & {
  customer?: IncidentRelation | null;
  site?: IncidentRelation | null;
};

export type Incident = {
  id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  previousStatus: string;
  currentStatus: string;
  startedAt: string;
  resolvedAt: string | null;
  lastSeenAt: string;
  source: string;
  category: string | null;
  probableCause: string | null;
  aiSummary: string | null;
  device: IncidentDevice | null;
  customer: IncidentRelation | null;
  site: IncidentRelation | null;
};

export type IncidentsResult = {
  data: Incident[];
  hasError: boolean;
  fetchedAt: number;
};

export const INCIDENTS_URL = `${process.env.API_URL ?? "http://localhost:4000"}/incidents`;

export async function getIncidents(): Promise<IncidentsResult> {
  const fetchedAt = Date.now();

  try {
    const response = await fetch(INCIDENTS_URL, { cache: "no-store" });

    if (!response.ok) {
      return { data: [], hasError: true, fetchedAt };
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      return { data: [], hasError: true, fetchedAt };
    }

    return { data: payload as Incident[], hasError: false, fetchedAt };
  } catch {
    return { data: [], hasError: true, fetchedAt };
  }
}
