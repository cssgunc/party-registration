const EmbeddedMap = () => {
  const location = encodeURIComponent(
    "Office of Off-Campus Student Life, UNC Chapel Hill"
  );

  return (
    <div>
      <div className="w-full h-[450px] overflow-hidden rounded-2xl shadow-md">
        <iframe
          className="w-full h-full"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={`https://www.google.com/maps/embed/v1/search?q=${location}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
        />
      </div>
    </div>
  );
};

export default EmbeddedMap;
