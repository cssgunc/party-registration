import { Button } from "@/components/ui/button";
import { IncidentDto } from "@/lib/api/location/location.types";
import { useState } from "react";
import IncidentSidebarCard from "./IncidentSidebarCard";

type IncidentSidebarProps = {
  incidents: IncidentDto[];
};

export default function IncidentSidebar({ incidents }: IncidentSidebarProps) {
  const [incidentList, setIncidentList] = useState<IncidentDto[]>(incidents);
  const handleDeleteIncident = (incidentId: number) => {
    setIncidentList((prevIncidents) =>
      prevIncidents.filter((incident) => incident.id !== incidentId)
    );
  };
  return (
    <div className="">
      <h1 className="text-lg font-semibold">Incidents</h1>
      <p className="text-sm text-gray-500">
        Manage the incidents for this location here.
      </p>
      {incidentList.map((incident) => (
        <IncidentSidebarCard
          incidents={[incident]}
          key={incident.id}
          onDeleteIncident={handleDeleteIncident}
        />
      ))}
      <Button variant="default" className="mt-4">
        Add Incident
      </Button>
    </div>
  );
}
