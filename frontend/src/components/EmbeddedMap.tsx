import { Party } from "@/types/api/party";

interface EmbeddedMapProps {
  parties: Party[];
}

const EmbeddedMap = ({ parties }: EmbeddedMapProps) => {
  const partyLocations =
    parties && parties.length > 0
      ? parties
          .map((party) => encodeURIComponent(party.addressId.toString()))
          .join("|")
      : encodeURIComponent(
          "Office of Off-Campus Student Life, UNC Chapel Hill"
        );

  return (
    <div className="w-full h-[450px] overflow-hidden rounded-2xl shadow-md">
      <iframe
        className="w-full h-full"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        src={`https://www.google.com/maps/embed/v1/place?q=${partyLocations}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
      />
    </div>
  );
};

export default EmbeddedMap;
