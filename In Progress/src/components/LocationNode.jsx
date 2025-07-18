import React, { useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ChevronUp, Plus, Trash2 } from "lucide-react";

// --- Framer Motion variants ---
const assetPanelVariants = {
  initial: { opacity: 0, y: -18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -14, scale: 0.98 },
  transition: { type: "spring", stiffness: 410, damping: 32 },
};

function useClickAway(ref, onAway, enabled) {
  const handler = useCallback(
    e => {
      if (enabled && ref.current && !ref.current.contains(e.target)) onAway();
    },
    [enabled, onAway]
  );
  React.useEffect(() => {
    if (!enabled) return;
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [enabled, handler]);
}

// --- Memoized LocationNode ---
const LocationNode = React.memo(function LocationNode({
  location,
  assets,
  expandedId,
  setExpandedId,
  onAdd,
  onDelete,
}) {
  const expanded = expandedId === location.id;
  const ref = useRef();
  useClickAway(ref, () => expanded && setExpandedId(null), expanded);

  // Memoize asset list
  const nodeAssets = useMemo(() => assets, [assets]);

  return (
    <div
      ref={ref}
      style={{
        marginBottom: 8,
        borderRadius: 10,
        background: expanded ? "#212649" : "#181c2f",
        boxShadow: expanded ? "0 2px 12px #0008" : "none",
        transition: "background 0.15s, box-shadow 0.22s",
        position: "relative",
        border: "1px solid #22243d",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.1em 1.4em",
          cursor: "pointer",
        }}
      >
        <div style={{ fontWeight: 700, color: "#ffd700", fontSize: "1.08em" }}>
          {location.name}
          <span style={{ color: "#ffe066", fontWeight: 400, marginLeft: 12, fontSize: "0.95em" }}>
            {location.code}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={e => {
              e.stopPropagation();
              onAdd && onAdd();
            }}
            style={{
              background: "#27e373",
              border: "none",
              borderRadius: 6,
              padding: "0.35em 0.6em",
              color: "#23263a",
              fontWeight: 700,
              fontSize: "1.01em",
              cursor: "pointer",
            }}
            title="Add location at this node"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete && onDelete();
            }}
            style={{
              background: "#ef4444",
              border: "none",
              borderRadius: 6,
              padding: "0.35em 0.6em",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.01em",
              cursor: "pointer",
            }}
            title="Delete location"
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setExpandedId(expanded ? null : location.id);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#ffd700",
              fontSize: "1.4em",
              cursor: "pointer",
              outline: "none",
            }}
            title={expanded ? "Collapse assets" : "Show assets"}
          >
            {expanded ? <ChevronUp size={22} /> : <Eye size={22} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="assets"
            initial={assetPanelVariants.initial}
            animate={assetPanelVariants.animate}
            exit={assetPanelVariants.exit}
            transition={assetPanelVariants.transition}
            style={{
              borderTop: "1px solid #ffe06633",
              background: "#191d36",
              padding: "1.15em 1.4em 0.9em 1.7em",
              marginBottom: 2,
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
            }}
          >
            <div style={{ fontWeight: 600, color: "#ffd700", fontSize: "1.01em", marginBottom: 7 }}>
              {nodeAssets.length === 0
                ? "No assets in this location"
                : `Assets in ${location.name}:`}
            </div>
            {nodeAssets.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {nodeAssets.map(asset => (
                  <li key={asset.id}
                      style={{ color: "#e3e6f6", fontWeight: 500, fontSize: "1.01em", marginBottom: 4 }}>
                    <span style={{ color: "#bfc3d1" }}>{asset.type}</span>
                    {" — "}
                    <span>{asset.id}</span>
                    {asset.serial_no && (
                      <span style={{ color: "#ffe066", marginLeft: 8 }}>SN: {asset.serial_no}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {/* Collapse button */}
            <button
              onClick={() => setExpandedId(null)}
              style={{
                display: "block",
                margin: "18px auto 0 auto",
                background: "none",
                border: "none",
                color: "#ffd700",
                fontWeight: 600,
                fontSize: "1.06em",
                cursor: "pointer",
              }}
              title="Collapse"
            >
              <ChevronUp size={20} style={{ marginBottom: -3, marginRight: 3 }} />
              Collapse
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default LocationNode;
