import { authenticatedApiFetch } from "@/lib/api-auth";

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

export async function getIncidents(): Promise<IncidentsResult> {
  const fetchedAt = Date.now();

  try {
    const result = await authenticatedApiFetch("/incidents", {
      cache: "no-store",
    });

    if (!result.ok) {
      return { data: [], hasError: true, fetchedAt };
    }

    const { response } = result;

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
