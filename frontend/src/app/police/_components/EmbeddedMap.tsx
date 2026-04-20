"use client";

import { PhoneLink } from "@/components/PhoneLink";
import { PartyDto } from "@/lib/api/party/party.types";
import { formatContactPreference } from "@/lib/utils";
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
  activePoiKey?: string;
  location: google.maps.LatLngLiteral;
};

interface EmbeddedMapProps {
  parties: PartyDto[];
  activeParty?: PartyDto;
  center?: { lat: number; lng: number };
  onSelect?: (party: PartyDto | null) => void;
}

const EmbeddedMap = ({
  parties,
  activeParty,
  center,
  onSelect,
}: EmbeddedMapProps) => {
  const locations = useMemo(
    () =>
      parties && parties.length > 0
        ? parties.map((party) => ({
            key: party.id.toString(),
            location: {
              lat: party.location.latitude,
              lng: party.location.longitude,
            },
            party,
          }))
        : [],
    [parties]
  );

  const activePoiKey = activeParty ? activeParty.id.toString() : undefined;
  const defaultZoom = center ? 17 : 14;
  const mapCenter =
    center ||
    (parties && parties.length > 0
      ? locations[0].location
      : { lat: 35.911232, lng: -79.050331 });

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapKey = center ? `${center.lat}-${center.lng}` : "default";

  // Stabilize reference so the circle effect doesn't re-fire when the parent
  // passes a new inline object with the same lat/lng values.
  const searchCenter = useMemo(
    () => (center ? { lat: center.lat, lng: center.lng } : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center?.lat, center?.lng]
  );

  return (
    <div className="w-full h-full overflow-hidden rounded-md">
      <APIProvider
        apiKey={API_KEY}
        onLoad={() => console.log("Maps API loaded.")}
      >
        <Map
          key={mapKey}
          defaultZoom={defaultZoom}
          defaultCenter={mapCenter}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID!}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <PoiMarkers
            pois={locations}
            activePoiKey={activePoiKey}
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
  onSelect?: (party: PartyDto | null) => void;
  searchCenter?: { lat: number; lng: number };
};

const SELECTED_ZOOM = 17;
const METERS_PER_MILE = 1609.344;
const DEFAULT_SEARCH_RADIUS_MILES = 0.25;

const parsedSearchRadiusMiles = Number(
  process.env.NEXT_PUBLIC_PARTY_SEARCH_RADIUS_MILES
);
const SEARCH_RADIUS_METERS =
  (Number.isFinite(parsedSearchRadiusMiles)
    ? parsedSearchRadiusMiles
    : DEFAULT_SEARCH_RADIUS_MILES) * METERS_PER_MILE;

const PoiMarkers = ({
  pois,
  activePoiKey,
  onSelect,
  searchCenter,
}: PoiMarkersProps) => {
  const map = useMap();
  const [selectedPoi, setSelectedPoi] = useState<(typeof pois)[0] | null>(null);

  const getShortAddress = (location: PartyDto["location"]): string => {
    const parts = [];
    if (location.street_number) parts.push(location.street_number);
    if (location.street_name) parts.push(location.street_name);
    if (location.unit) parts.push(`Unit ${location.unit}`);
    return parts.join(" ") || location.formatted_address;
  };

  useEffect(() => {
    if (!map || !activePoiKey) return;

    const target = pois.find((p) => p.key === activePoiKey);
    if (target) {
      map.panTo(target.location);
      map.setZoom(SELECTED_ZOOM);
    }
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
      {pois.map((poi: Poi) => (
        <AdvancedMarker
          key={poi.key}
          position={poi.location}
          clickable={true}
          onClick={handleClick(poi)}
        >
          <Pin
            background={poi == selectedPoi ? "#4285F4" : "#EA4335"}
            glyphColor={"#fff"}
            borderColor={poi == selectedPoi ? "#1967D2" : "#B31412"}
          />
        </AdvancedMarker>
      ))}
      {selectedPoi && selectedPoi.party && (
        <InfoWindow
          position={selectedPoi.location}
          onCloseClick={handleClose}
          headerContent={
            <div className="font-semibold text-sm flex">
              {getShortAddress(selectedPoi.party.location)}
            </div>
          }
        >
          <div className="space-y-1.5 text-sm">
            <p className="text-gray-700">
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
                <span className="text-gray-600">
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
