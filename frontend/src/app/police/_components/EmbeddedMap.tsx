"use client";

import { PhoneLink } from "@/components/PhoneLink";
import { ExactMatchDto, PartyPoliceDto } from "@/lib/api/party/party.types";
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
import { useEffect, useState } from "react";

type Poi = {
  key: string;
  location: google.maps.LatLngLiteral;
};

interface EmbeddedMapProps {
  parties: PartyPoliceDto[];
  activeParty?: PartyPoliceDto;
  center?: { lat: number; lng: number };
  exactMatch?: ExactMatchDto;
  onSelect?: (party: PartyPoliceDto | null) => void;
}

/**
 * Google Maps panel displaying pin markers for registered parties in the police
 * view.
 *
 * Wraps `@vis.gl/react-google-maps` with `PoiMarkers` to render color-coded
 * pins (default red, exact-match blue, selected blue), a search-radius circle
 * when an address is active, and an `InfoWindow` popup with party contact
 * details. Selecting a pin notifies the parent via `onSelect`.
 */
const EmbeddedMap = ({
  parties,
  activeParty,
  center,
  exactMatch,
  onSelect,
}: EmbeddedMapProps) => {
  const locations =
    parties && parties.length > 0
      ? parties.map((party) => ({
          key: String(party.id),
          location: {
            lat: party.location.latitude,
            lng: party.location.longitude,
          },
          party,
        }))
      : [];

  const activePoiKey =
    activeParty?.id !== undefined ? String(activeParty.id) : undefined;

  const exactMatchPoiMatch = exactMatch?.google_place_id
    ? parties?.find(
        (p) => p.location.google_place_id === exactMatch.google_place_id
      )
    : undefined;
  const exactMatchPoiKey = exactMatchPoiMatch
    ? String(exactMatchPoiMatch.id)
    : undefined;
  const defaultZoom = center ? 17 : 14;
  const mapCenter =
    center ||
    (parties && parties.length > 0
      ? locations[0].location
      : { lat: 35.911232, lng: -79.050331 });

  const API_KEY = clientEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapKey = center ? `${center.lat}-${center.lng}` : "default";

  const searchCenter = center
    ? { lat: center.lat, lng: center.lng }
    : undefined;

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
  pois: (Poi & { party?: PartyPoliceDto })[];
  activePoiKey?: string;
  exactMatchPoiKey?: string;
  exactMatchKey?: string;
  exactMatchNoPartyLocation?: google.maps.LatLngLiteral;
  onSelect?: (party: PartyPoliceDto | null) => void;
  searchCenter?: { lat: number; lng: number };
};

const PIN_COLORS = {
  default: { background: "#EA4335", border: "#B31412" },
  exactMatch: { background: "#1967D2", border: "#0D47A1" },
  selected: { background: "#4285F4", border: "#1967D2" },
} as const;

/**
 * Select background/border colors for a map pin.
 *
 * Returns the "selected" palette when the pin is the active selection, the
 * "exactMatch" palette when it matches the proximity-search address, or the
 * default red palette otherwise.
 */
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

/**
 * Renders all party pin markers, an optional exact-match location pin, the
 * search-radius circle, and the selected-pin info window inside a Google Map.
 *
 * Pans and zooms the map when `activePoiKey` changes, draws a translucent
 * radius circle around `searchCenter`, and manages the open/closed state of
 * the `InfoWindow`. Clicking a pin updates both the local selected state and
 * notifies the parent via `onSelect`.
 */
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

  const getShortAddress = (location: PartyPoliceDto["location"]): string => {
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

  const handleClick =
    (poi: (typeof pois)[0]) => (ev: google.maps.MapMouseEvent) => {
      if (!map || !ev.latLng) return;
      map.panTo(ev.latLng);
      map.setZoom(SELECTED_ZOOM);
      setSelectedPoi(poi);

      if (poi.party && onSelect) {
        onSelect(poi.party);
      }
    };

  const handleClose = () => {
    setSelectedPoi(null);
    if (onSelect) {
      onSelect(null);
    }
  };

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
