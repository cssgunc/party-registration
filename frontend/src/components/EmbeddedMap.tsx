"use client";

import { Party } from "@/types/api/party";
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { useCallback, useState } from "react";

interface EmbeddedMapProps {
  parties: Party[];
  activeParty?: Party;
}
interface PoiMarkersProps {
  pois: Poi[];
  activePoiKey?: string;
}
type Poi = { key: string; location: google.maps.LatLngLiteral };

const EmbeddedMap = ({ parties, activeParty }: EmbeddedMapProps) => {
  const default_locations: Poi[] = [
    { key: "polkPlace", location: { lat: 35.911232, lng: -79.050331 } },
    { key: "davisLibrary", location: { lat: 35.910784, lng: -79.047729 } },
    { key: "oldWell", location: { lat: 35.911473, lng: -79.050105 } },
    { key: "kenanStadium", location: { lat: 35.906839, lng: -79.047793 } },
  ];
  const locations =
    parties && parties.length > 0
      ? parties.map((party) => ({
          key: party.id.toString(),
          location: {
            lat: party.location.latitude,
            lng: party.location.longitude,
          },
        }))
      : default_locations;
  const activePoiKey = activeParty ? activeParty.id.toString() : undefined;
  const defaultZoom = 13;
  const defaultCenter =
    parties && parties.length > 0
      ? locations[0].location
      : { lat: 35.911232, lng: -79.050331 };
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  return (
    <div className="w-full h-[450px] overflow-hidden rounded-2xl shadow-md">
      <APIProvider
        apiKey={API_KEY}
        onLoad={() => console.log("Maps API has loaded.")}
      >
        <Map
          defaultZoom={defaultZoom}
          defaultCenter={defaultCenter}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID!}
        >
          <PoiMarkers pois={locations} activePoiKey={activePoiKey} />
        </Map>
      </APIProvider>
    </div>
  );
};
const PoiMarkers = ({ pois }: PoiMarkersProps) => {
  const map = useMap();
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  const handleClick = useCallback(
    (poi: Poi) => (ev: google.maps.MapMouseEvent) => {
      if (!map || !ev.latLng) return;
      map.panTo(ev.latLng);
      setSelectedPoi(poi);
    },
    [map]
  );

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
      {selectedPoi && (
        <InfoWindow
          position={selectedPoi.location}
          onCloseClick={() => setSelectedPoi(null)}
        >
          <div>{selectedPoi.key}</div>
        </InfoWindow>
      )}
    </>
  );
};

export default EmbeddedMap;
