import LocationManagerPanel from "./LocationManagerPanel";

function AdminPanel({ clientId }) {
  const [showLocManager, setShowLocManager] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowLocManager(true)}
        style={{
          background: "#fdd835",
          color: "#23263a",
          fontWeight: 700,
          fontSize: "1.09em",
          borderRadius: 11,
          border: "none",
          padding: "12px 32px",
          marginTop: 10,
          boxShadow: "0 2px 14px #0003",
          cursor: "pointer",
        }}
      >
        Location Manager
      </button>
      <LocationManagerPanel
        clientId={clientId}
        open={showLocManager}
        onClose={() => setShowLocManager(false)}
      />
    </>
  );
}
