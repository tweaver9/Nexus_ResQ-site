import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getFirestore, collection, getDocs, writeBatch, doc, getDoc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

// === STATIC ===
const db = getFirestore();
const clientId = "demo-client"; // Set this dynamically in your app
const adminUsername = "admin@nexus"; // Replace with actual username/session

const SPECIAL_LEVEL0 = [
  { id: "newly_added", name: "Newly Added", code: "001", level: 0 },
  { id: "not_assigned", name: "Not Assigned", code: "111", level: 0 },
  { id: "out_for_hydro", name: "Out for Hydro", code: "002", level: 0 },
];

// === Confirm Modal ===
function ConfirmModal({ open, onClose, onConfirm, children, danger = false }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={{
            position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.55)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            style={{
              background: "#151b2e", minWidth: 370, maxWidth: 470,
              borderRadius: 15, boxShadow: "0 8px 40px #000b",
              padding: "36px 28px 18px 28px", color: "#fff"
            }}>
            <div>{children}</div>
            <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={onClose}
                style={{ background: "#23263a", color: "#fff", border: "none", borderRadius: 7, padding: "9px 22px", fontWeight: 600, fontSize: "1em", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={onConfirm}
                style={{
                  background: danger ? "#ef4444" : "#fdd835",
                  color: danger ? "#fff" : "#23263a",
                  border: "none", borderRadius: 7, padding: "9px 22px",
                  fontWeight: 700, fontSize: "1em", cursor: "pointer", boxShadow: "0 2px 14px #0005"
                }}>
                {danger ? "Yes, delete location" : "Yes"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// === Snackbar ===
function Snackbar({ open, message, color = "#fdd835" }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 24 }}
          style={{
            position: "fixed",
            left: "50%",
            bottom: 34,
            transform: "translateX(-50%)",
            background: color,
            color: "#23263a",
            padding: "1.1em 2.1em",
            fontWeight: 700,
            borderRadius: 11,
            boxShadow: "0 2px 16px #0006",
            zIndex: 15000,
            fontSize: "1.08em"
          }}>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// === LocationManagerPanel Main ===
export default function LocationManagerPanel() {
  const [locations, setLocations] = useState([]);
  const [delimiter, setDelimiter] = useState("-");
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState([]); // list of selected IDs at each level
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteAssetCount, setDeleteAssetCount] = useState(0);
  const [doubleConfirm, setDoubleConfirm] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [error, setError] = useState("");

  // Load locations and delimiter
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        // Get locations
        const locSnap = await getDocs(collection(db, "clients", clientId, "locations"));
        const locs = [];
        locSnap.forEach(docSnap => locs.push({ ...docSnap.data(), id: docSnap.id }));
        // Ensure special locations are always present
        SPECIAL_LEVEL0.forEach(special => {
          if (!locs.some(l => l.id === special.id)) locs.unshift(special);
        });
        setLocations(locs);

        // Get delimiter
        const settingsDoc = await getDoc(doc(db, "clients", clientId, "settings", "location_tree"));
        setDelimiter(settingsDoc.exists() && settingsDoc.data().delimiter ? settingsDoc.data().delimiter : "-");
      } catch (err) {
        setError("Failed to load locations: " + err.message);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // --- Tree/Branch logic ---
  function getChildren(parentId, level) {
    return locations.filter(loc => loc.parentId === parentId && loc.level === level);
  }
  function getNodeById(id) {
    return locations.find(loc => loc.id === id);
  }

  // --- Navigation ---
  const level = currentPath.length;
  const currentParentId = currentPath.length === 0 ? null : currentPath[currentPath.length - 1];
  const nodes = locations.filter(
    loc => (loc.level === level && (level === 0 ? true : loc.parentId === currentParentId))
  );
  const showBack = currentPath.length > 0;

  // --- Deletion logic ---
  async function handleDeleteLocationBegin(location) {
    // Only allow for non-specials!
    setDeleteTarget(location);
    setDeleteAssetCount(0);
    setDoubleConfirm(false);

    // Get all descendant IDs
    const toDeleteIds = await getAllDescendantIds(locations, location.id);

    // Count all assets affected
    const assetSnap = await getDocs(collection(db, "clients", clientId, "assets"));
    let affected = 0;
    assetSnap.forEach(docSnap => {
      const a = docSnap.data();
      if (toDeleteIds.includes(a.location_id) ||
          toDeleteIds.includes(a.sublocation_id) ||
          toDeleteIds.includes(a.precisionlocation_id)) {
        affected++;
      }
    });
    setDeleteAssetCount(affected);
  }

  function handleDeleteCancel() {
    setDeleteTarget(null);
    setDeleteAssetCount(0);
    setDoubleConfirm(false);
  }

  async function handleDeleteConfirm() {
    setDoubleConfirm(true);
  }

  async function handleDeleteFinalConfirm() {
    setLoading(true);
    try {
      // 1. Find all descendants
      const toDeleteIds = await getAllDescendantIds(locations, deleteTarget.id);

      // 2. Get all affected assets
      const assetSnap = await getDocs(collection(db, "clients", clientId, "assets"));
      const batch = writeBatch(db);
      let affectedAssets = [];
      assetSnap.forEach(docSnap => {
        const a = docSnap.data();
        if (toDeleteIds.includes(a.location_id) ||
            toDeleteIds.includes(a.sublocation_id) ||
            toDeleteIds.includes(a.precisionlocation_id)) {
          // Set all location fields to "not_assigned", codes/names null, codes to 111s
          const assetRef = doc(db, "clients", clientId, "assets", docSnap.id);
          batch.update(assetRef, {
            location_id: "not_assigned",
            location_name: null,
            location_code: null,
            sublocation_id: null,
            sublocation_name: null,
            sublocation_code: null,
            precisionlocation_id: null,
            precisionlocation_name: null,
            precisionlocation_code: null,
            full_location_code: delimiter ? ["111", "111", "1111"].join(delimiter) : "1111111111",
            location_status: "not_assigned"
          });
          affectedAssets.push(docSnap.id);
        }
      });

      // 3. Delete all locations in the branch
      for (const locId of toDeleteIds) {
        batch.delete(doc(db, "clients", clientId, "locations", locId));
      }

      // 4. Commit
      await batch.commit();

      // 5. Log the action
      await setDoc(doc(db, "clients", clientId, "logs", uuidv4()), {
        action: `Deleted location "${deleteTarget.name || deleteTarget.id}". Reassigned ${affectedAssets.length} assets to Not Assigned.`,
        error: "",
        timestamp: new Date().toISOString(),
        username: adminUsername,
        severity: "Critical"
      });

      setSnackbarMsg("Location deleted. All assets reassigned to Not Assigned.");
      setShowSnackbar(true);

      // 6. Reload locations
      const locSnap = await getDocs(collection(db, "clients", clientId, "locations"));
      const locs = [];
      locSnap.forEach(docSnap => locs.push({ ...docSnap.data(), id: docSnap.id }));
      SPECIAL_LEVEL0.forEach(special => {
        if (!locs.some(l => l.id === special.id)) locs.unshift(special);
      });
      setLocations(locs);
      // If user deleted current path, back out
      setCurrentPath([]);
    } catch (err) {
      setError("Failed to delete location: " + err.message);
      // Log error
      await setDoc(doc(db, "clients", clientId, "logs", uuidv4()), {
        action: `Failed to delete location "${deleteTarget?.name || deleteTarget?.id}"`,
        error: err.message,
        timestamp: new Date().toISOString(),
        username: adminUsername,
        severity: "Critical"
      });
    }
    setLoading(false);
    setDeleteTarget(null);
    setDoubleConfirm(false);
  }

  // --- Snackbar auto close ---
  useEffect(() => {
    if (showSnackbar) {
      const t = setTimeout(() => setShowSnackbar(false), 3400);
      return () => clearTimeout(t);
    }
  }, [showSnackbar]);

  // === UI ===
  return (
    <div style={{ display: "flex", background: "#181c2f", borderRadius: 13, boxShadow: "0 2px 18px #0007", minHeight: 440, minWidth: 700 }}>
      {/* SIDEBAR: Top-level (level 0) */}
      <div style={{ minWidth: 220, maxWidth: 240, borderRight: "2px solid #23263a", background: "#151b2e", padding: "26px 12px 14px 20px" }}>
        <div style={{ fontWeight: 700, color: "#fdd835", fontSize: "1.1em", marginBottom: 16 }}>Locations</div>
        {locations.filter(l => l.level === 0).map(loc =>
          <div
            key={loc.id}
            onClick={() => setCurrentPath([loc.id])}
            style={{
              background: currentPath[0] === loc.id ? "#23263a" : "none",
              color: SPECIAL_LEVEL0.some(s => s.id === loc.id) ? "#ffe066" : "#fff",
              fontWeight: SPECIAL_LEVEL0.some(s => s.id === loc.id) ? 700 : 500,
              borderRadius: 8, padding: "8px 8px", marginBottom: 4,
              cursor: "pointer", fontSize: "1.02em",
              opacity: currentPath[0] === loc.id ? 1 : 0.9,
              transition: "background 0.15s"
            }}>
            {loc.name}
          </div>
        )}
      </div>

      {/* MAIN PANEL: current branch */}
      <div style={{ flex: 1, padding: "28px 34px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          {showBack && (
            <button
              onClick={() => setCurrentPath(path => path.slice(0, -1))}
              style={{ marginRight: 16, background: "#23263a", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, padding: "6px 16px", cursor: "pointer" }}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: "1.16em", fontWeight: 700, color: "#fdd835" }}>
            {level === 0 && "All Locations"}
            {level === 1 && `Sublocations in "${getNodeById(currentPath[0])?.name || ""}"`}
            {level === 2 && `Precision Locations in "${getNodeById(currentPath[1])?.name || ""}"`}
          </div>
        </div>
        {loading && <div style={{ color: "#ffd700", margin: "1.7em 0" }}>Loading…</div>}
        {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}
        {!loading && nodes.length === 0 && (
          <div style={{ color: "#bbb", padding: "18px 0" }}>
            No locations here yet.
          </div>
        )}
        {!loading && nodes.map(loc =>
          <motion.div key={loc.id}
            layout
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 370, damping: 34 }}
            style={{
              background: "#23263a", borderRadius: 8, marginBottom: 9, padding: "14px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 6px #0002"
            }}>
            <div>
              <div style={{ color: "#fdd835", fontWeight: 600, fontSize: "1.06em" }}>{loc.name}</div>
              <div style={{ color: "#aaa", fontSize: "0.98em" }}>{loc.code || "—"}</div>
            </div>
            <div style={{ display: "flex", gap: 13 }}>
              {/* Only show expand if possible */}
              {level < 2 && (
                <button onClick={() => setCurrentPath([...currentPath, loc.id])}
                  style={{ background: "#fdd835", color: "#23263a", border: "none", borderRadius: 7, padding: "6px 14px", fontWeight: 700, fontSize: "1em", cursor: "pointer" }}>
                  View {level === 0 ? "Sublocations" : "Precision"}
                </button>
              )}
              {/* Only allow delete for non-special locations */}
              {!SPECIAL_LEVEL0.some(s => s.id === loc.id) && (
                <button
                  onClick={() => handleDeleteLocationBegin(loc)}
                  style={{
                    background: "#23263a", color: "#ef4444", border: "1.5px solid #ef4444",
                    borderRadius: 7, fontWeight: 700, padding: "6px 14px", fontSize: "1em", cursor: "pointer"
                  }}>
                  Delete
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
      {/* Delete confirmation modals */}
      <ConfirmModal open={!!deleteTarget && !doubleConfirm} onClose={handleDeleteCancel} onConfirm={handleDeleteConfirm} danger>
        <div style={{ fontWeight: 600, fontSize: "1.07em", color: "#fff", padding: "12px 0 4px 0" }}>
          Are you sure you want to delete this location?
        </div>
        <div style={{ color: "#ffd700", margin: "6px 0" }}>
          This will place all assets from this level down, in a singular location.
        </div>
        <div style={{ color: "#fdd835", fontWeight: 700, marginBottom: 7 }}>
          {deleteAssetCount} assets will be affected.
        </div>
      </ConfirmModal>
      <ConfirmModal open={!!deleteTarget && doubleConfirm} onClose={handleDeleteCancel} onConfirm={handleDeleteFinalConfirm} danger>
        <div style={{ fontWeight: 600, fontSize: "1.07em", color: "#fff", padding: "12px 0 4px 0" }}>
          Are you <span style={{ color: "#fdd835" }}>absolutely sure</span> you want to delete this location?
        </div>
        <div style={{ color: "#ef4444", fontWeight: 800, margin: "8px 0" }}>
          This is !! PERMANENT !!
        </div>
        <div style={{ color: "#fff", marginBottom: 9 }}>
          All assets that are located from this location
          <span style={{ color: "#fdd835", fontWeight: 700 }}> (#{deleteAssetCount}, all types)</span>
          will need to be re-assigned to an actual location via scanner, one by one.
        </div>
        <div style={{ color: "#ffd700", fontWeight: 600, marginBottom: 12 }}>
          All locations from this one forward (sublocations and precision locations) will also be permanently DELETED!
        </div>
      </ConfirmModal>
      <Snackbar open={showSnackbar} message={snackbarMsg} color="#fdd835" />
    </div>
  );
}

// --- Helper: Get all descendant IDs ---
async function getAllDescendantIds(locations, rootId) {
  const ids = [rootId];
  const stack = [rootId];
  while (stack.length) {
    const parent = stack.pop();
    const children = locations.filter(l => l.parentId === parent);
    for (const child of children) {
      ids.push(child.id);
      stack.push(child.id);
    }
  }
  return ids;
}
