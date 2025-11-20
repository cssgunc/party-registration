"use client";

import { Party } from "@/types/api/party";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useState } from "react";
interface PoiMarkersProps {
  pois: (Poi & { party?: Party })[];
  activePoiKey?: string;
  onSelect?: (party: Party) => void; // 👈 new
}
type Poi = {
  key: string;
  activePoiKey?: string;
  location: google.maps.LatLngLiteral;
};

interface EmbeddedMapProps {
  parties: Party[];
  activeParty?: Party;
  center?: { lat: number; lng: number };
  onSelect?: (party: Party) => void;
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
    <div className="w-full h-[450px] overflow-hidden rounded-2xl shadow-md">
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

const PoiMarkers = ({ pois, activePoiKey, onSelect }: PoiMarkersProps) => {
  const map = useMap();
  const [selectedPoi, setSelectedPoi] = useState<(typeof pois)[0] | null>(null);
  useEffect(() => {
    if (!map || !activePoiKey) return;

    const target = pois.find((p) => p.key === activePoiKey);
    if (target) map.panTo(target.location);
  }, [activePoiKey, map]);

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

  return (
    <>
      {pois.map((poi) => {
        const isActive = poi.key === activePoiKey;

        return (
          <AdvancedMarker
            key={poi.key}
            position={poi.location}
            clickable
            onClick={handleClick(poi)}
          >
            <Pin
              background={isActive ? "#4285F4" : "#EA4335"}
              glyphColor="#fff"
              borderColor={isActive ? "#1967D2" : "#B31412"}
            />
          </AdvancedMarker>
        );
      })}
    </>
  );
};

export default EmbeddedMap;
