import { IncidentDto } from "@/lib/api/location/location.types";
import IncidentSidebarCard from "./IncidentSidebarCard";

type IncidentSidebarProps = {
  incidents: IncidentDto[];
};

export default function IncidentSidebar({ incidents }: IncidentSidebarProps) {
  return (
    <div className="">
      <h1 className="text-lg font-semibold">Incidents</h1>
      <p className="text-sm text-gray-500">
        Manage the incidents for this location here.
      </p>
      {incidents.map((incident) => (
        <IncidentSidebarCard incidents={[incident]} key={incident.id} />
      ))}
    </div>
  );
}
