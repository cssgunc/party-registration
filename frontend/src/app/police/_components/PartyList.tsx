"use client";

import IncidentDialog from "@/components/IncidentDialog";
import { useSnackbar } from "@/contexts/SnackbarContext";
import type {
  IncidentCreateDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { ExactMatchDto, PartyPoliceDto } from "@/lib/api/party/party.types";
import { usePoliceCreateIncident } from "@/lib/api/party/police-party.queries";
import { getErrorMessage } from "@/lib/errors";
import { useEffect, useRef, useState } from "react";
import PartyCard, { PartyCardData } from "./PartyCard";

interface PartyListProps {
  parties?: PartyPoliceDto[];
  onSelect?: (party: PartyPoliceDto | null) => void;
  activeParty?: PartyPoliceDto;
  exactMatch?: ExactMatchDto;
}

const PartyList = ({
  parties = [],
  onSelect,
  activeParty,
  exactMatch,
}: PartyListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentType, setIncidentType] =
    useState<IncidentSeverity>("in_person_warning");
  const [selectedData, setSelectedData] = useState<PartyCardData | null>(null);
  const { snackbarPromise } = useSnackbar();

  const createIncidentMutation = usePoliceCreateIncident({
    onOptimisticUpdate: () => {
      setIncidentDialogOpen(false);
    },
  });

  const handleCreateIncident = (data: IncidentCreateDto) => {
    snackbarPromise(createIncidentMutation.mutateAsync(data), {
      loading: "Creating incident...",
      success: "Incident created successfully",
      error: (err) =>
        getErrorMessage(err, {
          fallback: "Failed to create the incident. Please try again.",
        }),
    });
  };

  const openIncidentDialog = (
    data: PartyCardData,
    severity: IncidentSeverity
  ) => {
    setSelectedData(data);
    setIncidentType(severity);
    setIncidentDialogOpen(true);
  };

  useEffect(() => {
    if (!activeParty || !listRef.current) return;
    const container = listRef.current;
    const el = container.querySelector(`[data-party-id="${activeParty.id}"]`);
    if (!el) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elTop = elRect.top - containerRect.top + container.scrollTop;
    const elBottom = elTop + elRect.height;
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    if (elTop < containerTop) {
      container.scrollTo({ top: elTop, behavior: "smooth" });
    } else if (elBottom > containerBottom) {
      container.scrollTo({
        top: elBottom - container.clientHeight,
        behavior: "smooth",
      });
    }
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
      <div
        ref={listRef}
        className="flex flex-col flex-1 min-h-0 w-full overflow-y-auto scroll-smooth"
      >
        {exactMatchData && (
          <section aria-labelledby="party-list-exact-match">
            <h2
              id="party-list-exact-match"
              className="px-4 pt-4 subhead-content"
            >
              Exact Match:
            </h2>
            <ul className="list-none">
              <li className="border-b border-border">
                <PartyCard
                  data={exactMatchData}
                  onOpenIncidentDialog={(severity) =>
                    openIncidentDialog(exactMatchData, severity)
                  }
                />
              </li>
            </ul>
          </section>
        )}
        {parties.length > 0 && (
          <section aria-label="Nearby parties">
            {exactMatchData && (
              <h2 className="px-4 pt-4 subhead-content">Nearby Parties:</h2>
            )}
            <ul className="list-none">
              {parties.map((party) => {
                const cardData: PartyCardData = { hasParty: true, party };
                return (
                  <li key={party.id} data-party-id={party.id}>
                    <PartyCard
                      data={cardData}
                      onClick={() =>
                        onSelect?.(activeParty?.id === party.id ? null : party)
                      }
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
        onSubmit={handleCreateIncident}
        isSubmitting={createIncidentMutation.isPending}
        key={dialogKey}
      />
    </>
  );
};

export default PartyList;
