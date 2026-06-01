"use client";

import { PhoneLink } from "@/components/PhoneLink";
import { ExactMatchDto, PartyDto } from "@/lib/api/party/party.types";
import { clientEnv } from "@/lib/config/env.client";
import { formatAddress, formatContactPreference } from "@/lib/utils";
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

type Poi = {
  key: string;
  location: google.maps.LatLngLiteral;
};

interface EmbeddedMapProps {
  parties: PartyDto[];
  activeParty?: PartyDto;
  center?: { lat: number; lng: number };
  exactMatch?: ExactMatchDto;
  onSelect?: (party: PartyDto | null) => void;
}

const EmbeddedMap = ({
  parties,
  activeParty,
  center,
  exactMatch,
  onSelect,
}: EmbeddedMapProps) => {
  const locations = useMemo(
    () =>
      parties && parties.length > 0
        ? parties.map((party) => ({
            key: String(party.id),
            location: {
              lat: party.location.latitude,
              lng: party.location.longitude,
            },
            party,
          }))
        : [],
    [parties]
  );

  const activePoiKey =
    activeParty?.id !== undefined ? String(activeParty.id) : undefined;

  const exactMatchPoiKey = useMemo(() => {
    if (!exactMatch?.google_place_id || !parties) return undefined;
    const match = parties.find(
      (p) => p.location.google_place_id === exactMatch.google_place_id
    );
    return match ? String(match.id) : undefined;
  }, [exactMatch?.google_place_id, parties]);
  const defaultZoom = center ? 17 : 14;
  const mapCenter =
    center ||
    (parties && parties.length > 0
      ? locations[0].location
      : { lat: 35.911232, lng: -79.050331 });

  const API_KEY = clientEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapKey = center ? `${center.lat}-${center.lng}` : "default";

  // Stabilize reference so the circle effect doesn't re-fire when the parent
  // passes a new inline object with the same lat/lng values.
  const searchCenter = useMemo(
    () => (center ? { lat: center.lat, lng: center.lng } : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center?.lat, center?.lng]
  );

  const exactMatchKey = exactMatch?.google_place_id;

  const exactMatchNoPartyLocation =
    exactMatch && !exactMatch.party
      ? exactMatch.location
        ? {
            lat: exactMatch.location.latitude,
            lng: exactMatch.location.longitude,
          }
        : center
      : undefined;

  return (
    <div className="w-full h-full overflow-hidden rounded-md">
      <APIProvider apiKey={API_KEY}>
        <Map
          key={mapKey}
          defaultZoom={defaultZoom}
          defaultCenter={mapCenter}
          mapId={clientEnv.NEXT_PUBLIC_GOOGLE_MAP_ID}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <PoiMarkers
            pois={locations}
            activePoiKey={activePoiKey}
            exactMatchPoiKey={exactMatchPoiKey}
            exactMatchKey={exactMatchKey}
            exactMatchNoPartyLocation={exactMatchNoPartyLocation}
            onSelect={onSelect}
            searchCenter={searchCenter}
          />
        </Map>
      </APIProvider>
    </div>
  );
};

type PoiMarkersProps = {
  pois: (Poi & { party?: PartyDto })[];
  activePoiKey?: string;
  exactMatchPoiKey?: string;
  exactMatchKey?: string;
  exactMatchNoPartyLocation?: google.maps.LatLngLiteral;
  onSelect?: (party: PartyDto | null) => void;
  searchCenter?: { lat: number; lng: number };
};

const PIN_COLORS = {
  default: { background: "#EA4335", border: "#B31412" },
  exactMatch: { background: "#1967D2", border: "#0D47A1" },
  selected: { background: "#4285F4", border: "#1967D2" },
} as const;

function getPinColors(
  key: string,
  activePoiKey?: string,
  exactMatchPoiKey?: string
) {
  if (key === activePoiKey) return PIN_COLORS.selected;
  if (key === exactMatchPoiKey) return PIN_COLORS.exactMatch;
  return PIN_COLORS.default;
}

const SELECTED_ZOOM = 17;
const METERS_PER_MILE = 1609.344;
const SEARCH_RADIUS_METERS =
  clientEnv.NEXT_PUBLIC_PARTY_SEARCH_RADIUS_MILES * METERS_PER_MILE;

const PoiMarkers = ({
  pois,
  activePoiKey,
  exactMatchPoiKey,
  exactMatchKey,
  exactMatchNoPartyLocation,
  onSelect,
  searchCenter,
}: PoiMarkersProps) => {
  const map = useMap();
  const [selectedPoi, setSelectedPoi] = useState<(typeof pois)[0] | null>(null);

  const getShortAddress = (location: PartyDto["location"]): string => {
    return (
      formatAddress(location, ["street_number", "street_name", "unit"]) ||
      location.formatted_address
    );
  };

  useEffect(() => {
    if (!map || !activePoiKey) return;

    const target = pois.find((p) => p.key === activePoiKey);
    if (target) {
      if (map.getZoom() !== SELECTED_ZOOM) map.setZoom(SELECTED_ZOOM);
      map.panTo(target.location);
    }

    setSelectedPoi((prev) => (prev?.key === activePoiKey ? prev : null));
  }, [activePoiKey, map, pois]);

  useEffect(() => {
    if (!map || !searchCenter) return;

    const circle = new google.maps.Circle({
      map,
      center: searchCenter,
      radius: SEARCH_RADIUS_METERS,
      fillColor: "#4285F4",
      fillOpacity: 0.08,
      strokeColor: "#4285F4",
      strokeOpacity: 0.6,
      strokeWeight: 2,
      clickable: false,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, searchCenter]);

  const handleClick = useCallback(
    (poi: (typeof pois)[0]) => (ev: google.maps.MapMouseEvent) => {
      if (!map || !ev.latLng) return;
      map.panTo(ev.latLng);
      map.setZoom(SELECTED_ZOOM);
      setSelectedPoi(poi);

      if (poi.party && onSelect) {
        onSelect(poi.party);
      }
    },
    [map, onSelect]
  );

  const handleClose = useCallback(() => {
    setSelectedPoi(null);
    if (onSelect) {
      onSelect(null);
    }
  }, [onSelect]);

  return (
    <>
      {pois.map((poi: Poi) => {
        const colors = getPinColors(poi.key, activePoiKey, exactMatchPoiKey);
        return (
          <AdvancedMarker
            key={poi.key}
            position={poi.location}
            clickable={true}
            onClick={handleClick(poi)}
          >
            <Pin
              background={colors.background}
              glyphColor="#fff"
              borderColor={colors.border}
            />
          </AdvancedMarker>
        );
      })}
      {exactMatchNoPartyLocation && exactMatchKey && (
        <AdvancedMarker
          key={exactMatchKey}
          position={exactMatchNoPartyLocation}
          clickable={false}
        >
          <Pin
            background={PIN_COLORS.exactMatch.background}
            glyphColor="#fff"
            borderColor={PIN_COLORS.exactMatch.border}
          />
        </AdvancedMarker>
      )}
      {selectedPoi && selectedPoi.party && (
        <InfoWindow
          position={selectedPoi.location}
          onCloseClick={handleClose}
          headerContent={
            <span
              className="font-semibold text-sm flex"
              style={{ fontFamily: "var(--font-avenir-next)" }}
            >
              {getShortAddress(selectedPoi.party.location)}
            </span>
          }
        >
          <div
            className="space-y-1.5 text-sm -translate-y-1"
            style={{ fontFamily: "var(--font-avenir-next)" }}
          >
            <p>
              {format(selectedPoi.party.party_datetime, "MMM d, yyyy")} at{" "}
              {format(selectedPoi.party.party_datetime, "h:mm a")}
            </p>
            <div className="border-t pt-1.5">
              <p>
                {selectedPoi.party.contact_one.first_name}{" "}
                {selectedPoi.party.contact_one.last_name}
              </p>
              <div className="flex justify-between items-center text-xs">
                <PhoneLink
                  phoneNumber={
                    selectedPoi.party.contact_one.phone_number ?? "—"
                  }
                  contactPreference={
                    selectedPoi.party.contact_one.contact_preference
                  }
                />
                <span>
                  {formatContactPreference(
                    selectedPoi.party.contact_one.contact_preference
                  )}
                </span>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default EmbeddedMap;
