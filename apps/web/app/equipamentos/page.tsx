import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EquipmentManager } from "@/components/equipment/EquipmentManager";
import { getDashboardDevices } from "@/lib/dashboard-devices";

type EquipmentSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<EquipmentSearchParams>;
}) {
  const params = await searchParams;
  const { data: devices, hasError } = await getDashboardDevices();
  const errorMessage = readSearchParam(params.error);
  const successMessage = readSearchParam(params.success);
  const genericMessage = readSearchParam(params.message);
  const genericType = readSearchParam(params.type);
  const initialMessage = errorMessage
    ? { type: "error" as const, text: errorMessage }
    : successMessage
      ? { type: "success" as const, text: successMessage }
      : genericMessage
        ? {
            type:
              genericType === "error"
                ? ("error" as const)
                : ("success" as const),
            text: genericMessage,
          }
        : null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader
          title="Equipamentos"
          description="Lista de equipamentos monitorados"
        />
        <main className="p-8">
          <EquipmentManager
            devices={devices}
            hasLoadError={hasError}
            initialMessage={initialMessage}
          />
        </main>
      </div>
    </div>
  );
}
