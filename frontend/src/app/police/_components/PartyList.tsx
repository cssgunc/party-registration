"use client";

import IncidentDialog from "@/components/IncidentDialog";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useCreateIncident } from "@/lib/api/incident/incident.queries";
import type {
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { LocationDto } from "@/lib/api/location/location.types";
import {
  ExactMatchDto,
  NEARBY_KEY,
  PartyDto,
  ProximitySearchResponse,
} from "@/lib/api/party/party.types";
import { usePoliceCreateIncident } from "@/lib/api/party/police-party.queries";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import PartyCard, { PartyCardData } from "./PartyCard";

interface PartyListProps {
  parties?: PartyDto[];
  onSelect?: (party: PartyDto) => void;
  activeParty?: PartyDto;
  exactMatch?: ExactMatchDto;
}

function createOptimisticIncident(data: IncidentCreateDto): IncidentDto {
  return {
    id: Date.now(),
    location_id: 0,
    incident_datetime: data.incident_datetime,
    description: data.description,
    severity: data.severity,
    reference_id: data.reference_id ?? null,
  };
}

function createOptimisticLocation(
  exactMatch: ExactMatchDto,
  incident: IncidentDto
): LocationDto {
  return {
    id: 0,
    google_place_id: exactMatch.google_place_id,
    formatted_address: exactMatch.formatted_address,
    latitude: 0,
    longitude: 0,
    street_number: null,
    street_name: null,
    unit: null,
    city: null,
    county: null,
    state: null,
    country: null,
    zip_code: null,
    hold_expiration: null,
    incidents: [incident],
  };
}

function addOptimisticIncidentToExactMatch(
  data: ProximitySearchResponse,
  locationPlaceId: string,
  incident: IncidentDto
): ProximitySearchResponse {
  if (data.exact_match.google_place_id !== locationPlaceId) {
    return data;
  }

  return {
    ...data,
    exact_match: {
      ...data.exact_match,
      location: data.exact_match.location
        ? {
            ...data.exact_match.location,
            incidents: [incident, ...data.exact_match.location.incidents],
          }
        : createOptimisticLocation(data.exact_match, incident),
    },
  };
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
  const queryClient = useQueryClient();

  const partyMutation = usePoliceCreateIncident({
    onSuccess: () => {
      openSnackbar("Incident created successfully", "success");
      setIncidentDialogOpen(false);
    },
    onError: (error) => {
      openSnackbar(error.message || "Failed to create incident", "error");
    },
  });

  const strippedMutation = useCreateIncident({
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: NEARBY_KEY });

      const previousNearbyData =
        queryClient.getQueriesData<ProximitySearchResponse>({
          queryKey: NEARBY_KEY,
        });
      const optimisticIncident = createOptimisticIncident(payload);

      queryClient.setQueriesData<ProximitySearchResponse>(
        { queryKey: NEARBY_KEY },
        (old) => {
          if (!old) return old;

          return addOptimisticIncidentToExactMatch(
            old,
            payload.location_place_id,
            optimisticIncident
          );
        }
      );

      return { previousNearbyData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEARBY_KEY });
      openSnackbar("Incident created successfully", "success");
      setIncidentDialogOpen(false);
    },
    onError: (error, _payload, onMutateResult) => {
      onMutateResult?.previousNearbyData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
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
    setIncidentDialogOpen(false);

    if (selectedData?.hasParty) {
      partyMutation.mutate(data);
    } else {
      strippedMutation.mutate(data);
    }
  };

  const activeMutation = selectedData?.hasParty
    ? partyMutation
    : strippedMutation;

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
        isSubmitting={activeMutation.isPending}
        key={dialogKey}
      />
    </>
  );
};

export default PartyList;
