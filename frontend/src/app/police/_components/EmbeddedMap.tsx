"use client";

import { PartyDto } from "@/lib/api/party/party.types";
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";

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
  const locations =
    parties && parties.length > 0
      ? parties.map((party) => ({
          key: party.id.toString(),
          location: {
            lat: party.location.latitude,
            lng: party.location.longitude,
          },
          party,
        }))
      : [];

  const activePoiKey = activeParty ? activeParty.id.toString() : undefined;
  const defaultZoom = center ? 17 : 14;
  const mapCenter =
    center ||
    (parties && parties.length > 0
      ? locations[0].location
      : { lat: 35.911232, lng: -79.050331 });

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapKey = center ? `${center.lat}-${center.lng}` : "default";

  return (
    <div className="w-full h-full overflow-hidden rounded-2xl shadow-md">
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
};

const PoiMarkers = ({ pois, activePoiKey, onSelect }: PoiMarkersProps) => {
  const map = useMap();
  const [selectedPoi, setSelectedPoi] = useState<(typeof pois)[0] | null>(null);

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
        6
      )}`;
    }
    return phone;
  };

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
    if (target) map.panTo(target.location);
  }, [activePoiKey, map, pois]);

  const handleClick = useCallback(
    (poi: (typeof pois)[0]) => (ev: google.maps.MapMouseEvent) => {
      if (!map || !ev.latLng) return;
      map.panTo(ev.latLng);
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
            <div className="text-gray-700">
              {format(selectedPoi.party.party_datetime, "MMM d, yyyy")} at{" "}
              {format(selectedPoi.party.party_datetime, "h:mm a")}
            </div>
            <div className="border-t pt-1.5">
              <div>
                {selectedPoi.party.contact_one.first_name}{" "}
                {selectedPoi.party.contact_one.last_name}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>
                  {formatPhoneNumber(
                    selectedPoi.party.contact_one.phone_number
                  )}
                </span>
                <span className="text-gray-600">
                  {selectedPoi.party.contact_one.contact_preference
                    .charAt(0)
                    .toUpperCase() +
                    selectedPoi.party.contact_one.contact_preference
                      .slice(1)
                      .toLowerCase()}
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
