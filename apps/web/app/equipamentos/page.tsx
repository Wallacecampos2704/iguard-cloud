import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EquipmentManager } from "@/components/equipment/EquipmentManager";
import { getDashboardDevices } from "@/lib/dashboard-devices";

export default async function EquipamentosPage() {
  const { data: devices, hasError } = await getDashboardDevices();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <DashboardHeader
          title="Equipamentos"
          description="Lista de equipamentos monitorados"
        />
        <main className="p-8">
          <EquipmentManager devices={devices} hasLoadError={hasError} />
        </main>
      </div>
    </div>
  );
}
