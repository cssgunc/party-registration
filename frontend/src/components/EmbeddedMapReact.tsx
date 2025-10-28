import { APIProvider, Map } from "@vis.gl/react-google-maps";

const EmbeddedMapReact = () => {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  return (
    <div>
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: "100vw", height: "100vh" }}
          defaultCenter={{ lat: 22.54992, lng: 0 }}
          defaultZoom={3}
          gestureHandling="greedy"
          disableDefaultUI
        />
      </APIProvider>
    </div>
  );
};

export default EmbeddedMapReact;
