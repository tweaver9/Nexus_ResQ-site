import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import {
  collection, doc, setDoc, getDocs, getDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase"; // your db instance
import { LocationNode } from "./LocationNode";

// ---- UTILITY: Regex Suggestion ----
function suggestCode(siblings, regex) {
  if (!regex) return ""; // fallback
  // Example: find highest number, suggest next (e.g., A-01-113 → A-01-114)
  let maxNum = 0;
  let prefix = "";
  siblings.forEach(sib => {
    const match = sib.code.match(regex);
    if (match && match[1] && match[2]) {
      prefix = match[1];
      const num = parseInt(match[2], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  if (prefix) return prefix + String(maxNum + 1).padStart(3, "0");
  return "";
}

// ---- MODAL COMPONENT ----
export default function AddLocationModal({
  open, onClose, parentId, parentLevel, clientId, adminUsername, regexPattern,
  siblings, // array of locations at this level/parent
  parentPath = [],
  afterCreate = () => {},
  assets = [], // Pass assets for preview
}) {
  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [suggestedCode, setSuggestedCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const panelRef = useRef(null);
  const [expandedId, setExpandedId] = useState(null);

  // Suggest code when modal opens or siblings change
  useEffect(() => {
    if (open && regexPattern) {
      try {
        const regex = new RegExp(regexPattern);
        setSuggestedCode(suggestCode(siblings, regex));
      } catch {
        setSuggestedCode("");
      }
    } else {
      setSuggestedCode("");
    }
  }, [open, siblings, regexPattern]);

  // Handler: onBlur or onChange, validate uniqueness among siblings
  async function validateCode(codeToCheck) {
    setError("");
    if (!codeToCheck.trim()) {
      setError("Code required.");
      return false;
    }
    // Sibling-level uniqueness
    if (siblings.some(sib => sib.code === codeToCheck)) {
      setError("Code must be unique at this parent/level.");
      return false;
    }
    // Full barcode uniqueness (index)
    // Example barcode: combine all parent codes + this code
    let codesArr = [...parentPath.map(l => l.code), codeToCheck];
    let barcode = codesArr.filter(Boolean).join("-");
    if (!barcode) barcode = codeToCheck;
    const indexDoc = await getDoc(doc(db, `clients/${clientId}/full_location_codes/${barcode}`));
    if (indexDoc.exists()) {
      setError("Full barcode already in use. Please edit code.");
      return false;
    }
    return true;
  }

  // Handler: Save
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const newId = uuidv4();
    const level = parentLevel + 1;
    const user = adminUsername || "admin@nexus";

    // Compose barcode for index (parentPath = [{code, ...}])
    let codesArr = [...parentPath.map(l => l.code), code];
    let barcode = codesArr.filter(Boolean).join("-");
    if (!barcode) barcode = code;

    if (!name.trim()) {
      setError("Name required.");
      setSaving(false);
      return;
    }

    // Validate code uniqueness (local + global index)
    if (!(await validateCode(code))) {
      setSaving(false);
      return;
    }

    // Prepare Firestore writes
    const locationDoc = {
      id: newId,
      name: name.trim(),
      code: code.trim(),
      level,
      parentId: parentId || null,
      created_at: serverTimestamp(),
      created_by: user,
      assets: [],
    };

    const indexDoc = {
      locationId: newId,
      active: true,
      assets_count: 0,
      last_used: serverTimestamp(),
      code: code.trim(),
      level,
      name: name.trim(),
    };

    try {
      // Create location
      await setDoc(doc(db, `clients/${clientId}/locations/${newId}`), locationDoc);
      // Write to barcode index
      await setDoc(doc(db, `clients/${clientId}/full_location_codes/${barcode}`), indexDoc);
      afterCreate();
      onClose();
    } catch (err) {
      setError("Failed to create location: " + err.message);
    }
    setSaving(false);
  }

  // Auto-fill code from suggestion
  function handleSuggestClick() {
    setCode(suggestedCode);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={{
            position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.45)", zIndex: 12000, display: "flex", alignItems: "center", justifyContent: "center"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          ref={panelRef}
        >
          <div style={{width:'100%',maxWidth:480,marginRight:24}}>
            {/* Sibling preview */}
            {siblings.length > 0 && (
              <div style={{marginBottom:18}}>
                <div style={{fontWeight:700,color:'#ffd700',marginBottom:8}}>Existing Locations:</div>
                {siblings.map(node => (
                  <LocationNode
                    key={node.id}
                    node={node}
                    assets={assets}
                    isExpanded={expandedId === node.id}
                    onExpand={() => setExpandedId(node.id)}
                    onCollapse={() => setExpandedId(null)}
                    withinPanelRef={panelRef}
                  />
                ))}
              </div>
            )}
          </div>
          <motion.form
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.93, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onSubmit={handleSave}
            style={{
              background: "#151b2e", minWidth: 390, maxWidth: 460,
              borderRadius: 16, boxShadow: "0 8px 40px #000c",
              padding: "34px 28px 18px 28px", color: "#fff"
            }}>
            <div style={{ fontWeight: 700, fontSize: "1.15em", marginBottom: 18, color: "#ffd700" }}>Add Location</div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 600, fontSize: "1em", color: "#ffd700" }}>Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: "100%", borderRadius: 7, border: "1.3px solid #ffd700",
                  background: "#23263a", color: "#ffd700", padding: "0.7em 0.8em", fontSize: "1.08em",
                  margin: "7px 0 13px 0"
                }}
                autoFocus
                disabled={saving}
              />
              <label style={{ fontWeight: 600, fontSize: "1em", color: "#ffd700" }}>Code</label>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onBlur={e => validateCode(e.target.value)}
                  placeholder={suggestedCode ? `Try: ${suggestedCode}` : ""}
                  style={{
                    width: "80%", borderRadius: 7, border: "1.3px solid #ffd700",
                    background: "#23263a", color: "#ffd700", padding: "0.7em 0.8em", fontSize: "1.08em"
                  }}
                  disabled={saving}
                />
                {suggestedCode && (
                  <button type="button"
                    style={{
                      background: "#27e373", border: "none", borderRadius: 6,
                      padding: "0.45em 0.9em", color: "#23263a", fontWeight: 700, fontSize: "0.98em",
                      cursor: "pointer"
                    }}
                    title="Auto-fill suggested code"
                    onClick={handleSuggestClick}
                    tabIndex={-1}
                  >+ Use</button>
                )}
              </div>
              <div style={{ fontSize: "0.89em", color: "#aaa", marginBottom: 5 }}>
                <span>Barcode will be: <span style={{ color: "#fff", fontWeight: 700 }}>{[...parentPath.map(l => l.code), code || "___"].join("-")}</span></span>
              </div>
              {error && <div style={{ color: "#ef4444", fontWeight: 600, marginTop: 8 }}>{error}</div>}
            </div>
            <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={onClose}
                type="button"
                style={{ background: "#23263a", color: "#fff", border: "none", borderRadius: 7, padding: "9px 22px", fontWeight: 600, fontSize: "1em", cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit"
                style={{
                  background: "#fdd835", color: "#23263a", border: "none", borderRadius: 7,
                  padding: "9px 22px", fontWeight: 700, fontSize: "1em", cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1
                }}
                disabled={saving}
              >Save</button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
