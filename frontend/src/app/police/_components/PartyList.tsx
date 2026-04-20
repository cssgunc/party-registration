"use client";

import IncidentDialog from "@/components/IncidentDialog";
import { useSnackbar } from "@/contexts/SnackbarContext";
import type {
  IncidentCreateDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { ExactMatchDto, PartyDto } from "@/lib/api/party/party.types";
import { usePoliceCreateIncident } from "@/lib/api/party/police-party.queries";
import { useEffect, useState } from "react";
import PartyCard, { PartyCardData } from "./PartyCard";

interface PartyListProps {
  parties?: PartyDto[];
  onSelect?: (party: PartyDto) => void;
  activeParty?: PartyDto;
  exactMatch?: ExactMatchDto;
}

const PartyList = ({
  parties = [],
  onSelect,
  activeParty,
  exactMatch,
}: PartyListProps) => {
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentType, setIncidentType] =
    useState<IncidentSeverity>("in_person_warning");
  const [selectedData, setSelectedData] = useState<PartyCardData | null>(null);
  const { openSnackbar } = useSnackbar();

  const createIncidentMutation = usePoliceCreateIncident({
    onOptimisticUpdate: () => {
      setIncidentDialogOpen(false);
    },
    onSuccess: () => {
      openSnackbar("Incident created successfully", "success");
    },
    onError: (error) => {
      openSnackbar(error.message || "Failed to create incident", "error");
    },
  });

  const openIncidentDialog = (
    data: PartyCardData,
    severity: IncidentSeverity
  ) => {
    setSelectedData(data);
    setIncidentType(severity);
    setIncidentDialogOpen(true);
  };

  const handleSubmit = (data: IncidentCreateDto) => {
    createIncidentMutation.mutate(data);
  };

  // Scroll to the active party card after the page renders
  useEffect(() => {
    if (!activeParty) return;
    const el = document.querySelector(`[data-party-id="${activeParty.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeParty, parties]);

  if (parties.length === 0 && !exactMatch) {
    return (
      <div className="w-full px-4 py-8 text-center">
        <p className="content text-muted-foreground">No parties found</p>
      </div>
    );
  }

  const exactMatchData: PartyCardData | null = exactMatch
    ? exactMatch.party
      ? { hasParty: true, party: exactMatch.party }
      : {
          hasParty: false,
          location: exactMatch.location,
          locationPlaceId: exactMatch.google_place_id,
          formattedAddress: exactMatch.formatted_address,
        }
    : null;

  const dialogLocation = selectedData?.hasParty
    ? selectedData.party.location
    : (selectedData?.location ?? null);

  const dialogKey = incidentDialogOpen
    ? selectedData?.hasParty
      ? selectedData.party.id
      : selectedData?.locationPlaceId
    : undefined;

  return (
    <>
      <div className="flex flex-col min-h-0 flex-1">
        <div className="flex-1 min-h-0 w-full overflow-y-auto [scroll-behavior:smooth]">
          {exactMatchData && (
            <section>
              <h2 className="px-4 pt-4 subhead-content">Exact Match:</h2>
              <ul className="list-none">
                <li className="border-b border-border">
                  <PartyCard
                    data={exactMatchData}
                    // className="pt-0"
                    onOpenIncidentDialog={(severity) =>
                      openIncidentDialog(exactMatchData, severity)
                    }
                  />
                </li>
              </ul>
            </section>
          )}
          {parties.length > 0 && (
            <section>
              {exactMatchData && (
                <h2 className="px-4 pt-4 pb-2 subhead-content">
                  Nearby Parties:
                </h2>
              )}
              <ul className="list-none">
                {parties.map((party) => {
                  const cardData: PartyCardData = { hasParty: true, party };
                  return (
                    <li key={party.id}>
                      <PartyCard
                        data={cardData}
                        onClick={() => onSelect?.(party)}
                        isActive={activeParty?.id === party.id}
                        onOpenIncidentDialog={(severity) =>
                          openIncidentDialog(cardData, severity)
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      <IncidentDialog
        open={incidentDialogOpen}
        onOpenChange={setIncidentDialogOpen}
        defaultSeverity={incidentType}
        location={dialogLocation}
        locationPlaceId={
          selectedData?.hasParty ? undefined : selectedData?.locationPlaceId
        }
        formattedAddress={
          selectedData?.hasParty ? undefined : selectedData?.formattedAddress
        }
        onSubmit={handleSubmit}
        isSubmitting={createIncidentMutation.isPending}
        key={dialogKey}
      />
    </>
  );
};

export default PartyList;
