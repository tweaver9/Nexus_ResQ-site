import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ToggleRight, ToggleLeft } from "lucide-react";
import AddLocationModal from "./AddLocationModal";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

const MAX_VISIBLE = 7;

export default function ModernLocationTree({ clientId, adminUsername = "admin@nexus" }) {
  // --- STATE ---
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState(0);
  const [path, setPath] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalProps, setModalProps] = useState({});
  const [toggleCode, setToggleCode] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteStage, setDeleteStage] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- LOAD DATA ---
  useEffect(() => {
    reloadLocs();
    // eslint-disable-next-line
  }, [clientId]);

  // --- Helper: Reload locations ---
  const reloadLocs = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, `clients/${clientId}/locations`));
    const arr = [];
    snap.forEach(doc => arr.push({ ...doc.data(), id: doc.id }));
    setLocations(arr);
    setLoading(false);
  };

  // --- TREE/STACK for current view ---
  const currentLevel = path.length;
  const nodes = useMemo(
    () =>
      locations.filter(
        l =>
          l.level === currentLevel &&
          (currentLevel === 0 ? true : l.parentId === path[currentLevel - 1]?.id)
      ),
    [locations, path, currentLevel]
  );

  // --- Focus/Blur/Scroll logic ---
  const [focusIdx, setFocusIdx] = useState(0);
  useEffect(() => {
    setFocusIdx(0);
  }, [level, path, currentLevel, nodes.length]);

  // --- Toggling code/name in the list ---
  function getNodeLabel(node) {
    if (toggleCode) {
      return node.code && node.code.length <= 4
        ? node.code
        : `${node.name} (${node.code})`;
    } else {
      return node.name || node.code;
    }
  }

  // --- Add Node Handler ---
  function handleAddNode() {
    setModalProps({
      open: true,
      onClose: () => setShowModal(false),
      parentId: path[currentLevel - 1]?.id || null,
      parentLevel: currentLevel - 1,
      clientId,
      adminUsername,
      siblings: nodes,
      parentPath: [...path],
      afterCreate: () => setTimeout(() => reloadLocs(), 400)
    });
    setShowModal(true);
  }

  // --- Delete Node Handlers ---
  function beginDelete(node) {
    setDeleteTarget(node);
    setDeleteStage(1);
  }
  function cancelDelete() {
    setDeleteTarget(null);
    setDeleteStage(0);
    setDeleteLoading(false);
  }
  function confirmDelete() {
    setDeleteStage(2);
  }
  async function doDelete() {
    setDeleteLoading(true);
    try {
      const idsToDelete = getAllDescendantIds(locations, deleteTarget.id);
      const batch = writeBatch(db);
      for (const id of idsToDelete) {
        batch.delete(doc(db, `clients/${clientId}/locations/${id}`));
      }
      await batch.commit();
      setTimeout(() => reloadLocs(), 400);
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
    cancelDelete();
  }

  // --- Helper: Get all descendant IDs ---
  function getAllDescendantIds(locs, rootId) {
    const ids = [rootId];
    const stack = [rootId];
    while (stack.length) {
      const parent = stack.pop();
      const children = locs.filter(l => l.parentId === parent);
      for (const child of children) {
        ids.push(child.id);
        stack.push(child.id);
      }
    }
    return ids;
  }

  // --- UI ---
  return (
    <div style={{
      width: "100%", minHeight: "80vh", background: "#191d31", borderRadius: 16,
      boxShadow: "0 2px 20px #0008", display: "flex", flexDirection: "column", alignItems: "stretch"
    }}>
      {/* HEADER */}
      <div style={{ padding: "2.3rem 2.3rem 0.2rem 2.3rem", borderBottom: "1.5px solid #23263a" }}>
        <div style={{
          fontSize: "2.1rem", fontWeight: 700, color: "#ffd700", marginBottom: 7, letterSpacing: 0.02
        }}>
          Location Nexus
        </div>
        <div style={{
          fontSize: "0.95em", color: "#bfc3d1", marginBottom: 18, fontWeight: 400
        }}>
          Proceed through the nexus to manage all levels and locations. To manage assets, please return to the Assets tab in your dashboard.
        </div>
      </div>

      {/* NODE STACK */}
      <div style={{ display: "flex", flex: 1, minHeight: 380 }}>
        <div style={{
          width: 430, minWidth: 330, display: "flex", flexDirection: "column",
          alignItems: "flex-start", justifyContent: "center", padding: "2rem 0 0 2.5rem"
        }}>
          {/* Client Logo: plug in actual logo here */}
          <div style={{
            width: 170, height: 62, marginBottom: 36, background: "#23263a", borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center", color: "#ffd700",
            fontSize: "1.14em", fontWeight: 700, boxShadow: "0 2px 12px #0005"
          }}>Client Logo</div>
        </div>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", position: "relative"
        }}>
          {/* Code/Name toggle */}
          <button
            onClick={() => setToggleCode(v => !v)}
            style={{
              position: "absolute", top: 22, right: 28, zIndex: 10,
              background: "#23263a", color: "#ffd700", border: "none", borderRadius: 8,
              padding: "5px 16px", fontWeight: 600, fontSize: "1em", boxShadow: "0 1px 4px #0002", cursor: "pointer"
            }}
          >
            {toggleCode
              ? <ToggleRight size={20} style={{ marginRight: 7, marginBottom: -2 }} />
              : <ToggleLeft size={20} style={{ marginRight: 7, marginBottom: -2 }} />}
            {toggleCode ? "Code" : "Name"}
          </button>
          {/* Node stack with focus/blur/scroll */}
          <StackedNodeList
            nodes={nodes}
            focusIdx={focusIdx}
            setFocusIdx={setFocusIdx}
            onNodeClick={i => {
              setPath([...path.slice(0, currentLevel), nodes[i]]);
              setLevel(currentLevel + 1);
            }}
            onDelete={beginDelete}
            getNodeLabel={getNodeLabel}
            loading={loading}
          />
          {/* Add Node Button */}
          <motion.button
            layout
            onClick={handleAddNode}
            style={{
              marginTop: 22, marginBottom: 18, background: "#22e76d", color: "#111", fontWeight: 700,
              border: "none", borderRadius: 11, padding: "1.07em 2.2em", fontSize: "1.06em",
              boxShadow: "0 2px 8px #23263a22", display: "flex", alignItems: "center", gap: 11,
              cursor: "pointer"
            }}
            whileHover={{ scale: 1.07, boxShadow: "0 4px 14px #22e76d44" }}
          >
            <Plus size={20} />
            Add {currentLevel === 0 ? "Top Level Node" : "Node"}
          </motion.button>
        </div>
      </div>
      {/* MODALS */}
      <AddLocationModal {...modalProps} open={showModal} />
      <DeleteConfirmModal
        open={deleteStage > 0}
        stage={deleteStage}
        onClose={cancelDelete}
        onNext={confirmDelete}
        onDelete={doDelete}
        node={deleteTarget}
        loading={deleteLoading}
      />
    </div>
  );
}

// --- StackedNodeList ---
function StackedNodeList({ nodes, focusIdx, setFocusIdx, onNodeClick, onDelete, getNodeLabel, loading }) {
  const start = Math.max(0, Math.min(focusIdx - Math.floor(MAX_VISIBLE / 2), Math.max(0, nodes.length - MAX_VISIBLE)));
  const end = Math.min(nodes.length, start + MAX_VISIBLE);
  const shown = nodes.slice(start, end);

  return (
    <div style={{
      minHeight: 340, maxHeight: 370, width: 340, display: "flex", flexDirection: "column",
      alignItems: "stretch", justifyContent: "center", position: "relative", overflow: "hidden"
    }}>
      {loading ? (
        <div style={{ color: "#ffd700", fontSize: "1.18em", textAlign: "center", marginTop: 70 }}>Loading...</div>
      ) : shown.length === 0 ? (
        <div style={{ color: "#ffe066", fontSize: "1.09em", textAlign: "center", marginTop: 44 }}>No nodes found</div>
      ) : (
        <AnimatePresence initial={false}>
          {shown.map((node, idx) => {
            const absIdx = start + idx;
            const offset = absIdx - focusIdx;
            const focus = offset === 0;
            const blur = Math.min(Math.abs(offset), 2);
            const scale = 1 - Math.abs(offset) * 0.11;
            const y = offset * 45;
            const blurVal = focus ? 0 : blur * 2.5 + 1.5;
            const opacity = 1 - Math.abs(offset) * 0.25;
            return (
              <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, scale: 0.93, y: y + 35 }}
                animate={{ opacity, scale, y, filter: `blur(${blurVal}px)` }}
                exit={{ opacity: 0, scale: 0.92, y: y + 25, filter: "blur(7px)" }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                style={{
                  margin: "0.25em 0",
                  background: focus ? "#23263a" : "#181c2f",
                  color: "#ffd700",
                  fontWeight: 700,
                  fontSize: focus ? "1.25em" : "1.01em",
                  borderRadius: 12,
                  boxShadow: focus ? "0 2px 10px #0008" : "none",
                  padding: focus ? "1.13em 2.1em" : "0.85em 1.6em",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer",
                  zIndex: 10 - blur
                }}
                tabIndex={0}
                onClick={() => onNodeClick(absIdx)}
                onKeyDown={e => {
                  if (focus && (e.key === "Enter" || e.key === " ")) onNodeClick(absIdx);
                  if (e.key === "ArrowDown" && focusIdx < nodes.length - 1) setFocusIdx(focusIdx + 1);
                  if (e.key === "ArrowUp" && focusIdx > 0) setFocusIdx(focusIdx - 1);
                }}
              >
                <span>{getNodeLabel(node)}</span>
                <span style={{ display: "flex", gap: 16 }}>
                  <button
                    onClick={ev => { ev.stopPropagation(); onDelete(node); }}
                    style={{
                      background: "none", border: "none", color: "#ef4444", fontWeight: 700,
                      cursor: "pointer", fontSize: "1.09em", marginRight: -5
                    }}
                    title="Delete node"
                  >
                    <Trash2 size={18} />
                  </button>
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}

// --- DeleteConfirmModal ---
function DeleteConfirmModal({ open, stage, onClose, onNext, onDelete, node, loading }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.47)", zIndex: 14000, display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <motion.div
            initial={{ scale: 0.89, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 430, damping: 32 }}
            style={{
              background: "#151b2e", minWidth: 370, maxWidth: 430,
              borderRadius: 16, boxShadow: "0 8px 40px #000c",
              padding: "32px 28px 18px 28px", color: "#fff"
            }}>
            <div style={{ fontWeight: 700, fontSize: "1.12em", marginBottom: 13, color: "#ffd700" }}>
              {stage === 1 ? "Delete Node?" : "Final Delete Warning"}
            </div>
            {stage === 1 && (
              <>
                <div style={{ color: "#ffe066", margin: "11px 0 9px 0", fontWeight: 600 }}>
                  This will delete this node and all nodes beneath it.
                </div>
                <div style={{ color: "#fff", fontSize: "0.97em", marginBottom: 14 }}>
                  Assets in deleted locations will be left orphaned and must be re-assigned.
                </div>
              </>
            )}
            {stage === 2 && (
              <>
                <div style={{ color: "#ef4444", fontWeight: 800, margin: "13px 0 8px 0" }}>
                  Are you absolutely sure?
                </div>
                <div style={{ color: "#ffd700", marginBottom: 9 }}>
                  This is PERMANENT and will affect all sublocations and precision locations beneath this node.
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: 15, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={onClose}
                style={{ background: "#23263a", color: "#fff", border: "none", borderRadius: 7, padding: "9px 22px", fontWeight: 600, fontSize: "1em", cursor: loading ? "wait" : "pointer" }}>
                Cancel
              </button>
              {stage === 1 && (
                <button onClick={onNext}
                  style={{
                    background: "#fdd835", color: "#23263a", border: "none", borderRadius: 7,
                    padding: "9px 22px", fontWeight: 700, fontSize: "1em", cursor: "pointer"
                  }}>Continue</button>
              )}
              {stage === 2 && (
                <button onClick={onDelete} disabled={loading}
                  style={{
                    background: "#ef4444", color: "#fff", border: "none", borderRadius: 7,
                    padding: "9px 22px", fontWeight: 700, fontSize: "1em", cursor: loading ? "wait" : "pointer"
                  }}>{loading ? "Deleting..." : "Delete"}</button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
