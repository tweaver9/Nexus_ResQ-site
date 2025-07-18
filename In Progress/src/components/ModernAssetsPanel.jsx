import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Move } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { useAssetTypes } from '../hooks/useAssetTypes';
import { collection, setDoc, doc, serverTimestamp, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import MoveAssetModal from './MoveAssetModal';
import { moveAsset } from '../hooks/moveAsset';

function AssetManagement({ clientId, currentUser }) {
  const [selectedType, setSelectedType] = useState(null);
  const [assets, setAssets] = useState([]);
  const [assetForm, setAssetForm] = useState({ type: '', subtype: '', serial_no: '', status: '', asset_id: '' });
  const [addAssetStep, setAddAssetStep] = useState(1);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newAssetType, setNewAssetType] = useState('');
  const [newAssetSubtype, setNewAssetSubtype] = useState('');
  const [trackHydro, setTrackHydro] = useState(false);
  const [hydroDue, setHydroDue] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [moveTypeModalOpen, setMoveTypeModalOpen] = useState(false);
  const [pendingAsset, setPendingAsset] = useState(null);
  const [moveType, setMoveType] = useState(null); // "single" or "swap" or "swap-confirm"
  const [swapSelectModalOpen, setSwapSelectModalOpen] = useState(false);
  const [swapWithAsset, setSwapWithAsset] = useState(null);

  const { assetTypes: rawAssetTypes, subtypes, loading: typesLoading, error: typesError } = useAssetTypes(clientId);
  const assetTypes = Array.isArray(rawAssetTypes) ? rawAssetTypes : [];
  const subtypesForDropdown = Array.isArray(subtypes) ? subtypes : [];
  const filteredAssets = selectedType ? assets.filter(a => a.type === selectedType) : [];

  useEffect(() => {
    async function loadAssets() {
      setAssetsLoading(true);
      setAssetsError(null);
      try {
        const assetsRef = collection(db, `clients/${clientId}/assets`);
        const snap = await getDocs(assetsRef);
        const assetsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAssets(assetsData);
      } catch (error) {
        setAssetsError(error);
      } finally {
        setAssetsLoading(false);
      }
    }
    loadAssets();
  }, [clientId]);

  useEffect(() => {
    async function loadLocations() {
      const locsRef = collection(db, `clients/${clientId}/locations`);
      const snap = await getDocs(locsRef);
      setLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    loadLocations();
  }, [clientId]);

  const getAssetTypeDisplayName = (type) => {
    const assetType = assetTypes.find(t => t.type === type);
    return assetType ? assetType.label : type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleAddAssetType = () => setShowAddTypeModal(true);
  const handleCloseModal = () => { setShowAddTypeModal(false); setNewAssetType(''); setNewAssetSubtype(''); };
  const handleOpenAddAsset = () => { setAssetForm({ type: '', subtype: '', serial_no: '', status: '', asset_id: '' }); setAddAssetStep(1); setShowAddAssetModal(true); setTrackHydro(false); setHydroDue(''); };
  const handleCloseAddAsset = () => { setShowAddAssetModal(false); setAddAssetStep(1); setAssetForm({ type: '', subtype: '', serial_no: '', status: '', asset_id: '' }); setTrackHydro(false); setHydroDue(''); };
  const handleAddTypeFromAsset = () => { setShowAddAssetModal(false); setShowAddTypeModal(true); };
  const handleAddAssetNext = () => setAddAssetStep(2);
  const handleEditAsset = () => { setConfirmationOpen(false); setAddAssetStep(2); setShowAddAssetModal(true); };
  const handleCancelAsset = () => {
    setConfirmationOpen(false);
    setShowAddAssetModal(false);
    setAddAssetStep(1);
    setAssetForm({ type: '', subtype: '', serial_no: '', status: '', asset_id: '' });
    setTrackHydro(false);
    setHydroDue('');
    setNotification('Asset creation cancelled.');
    setTimeout(() => setNotification(null), 3000);
  };
  const handleConfirmAsset = async () => {
    try {
      const username = currentUser.displayName;
      const { asset_id, serial_no, status, subtype, type } = assetForm;
      const assetDoc = {
        created_at: serverTimestamp(),
        created_by: username,
        full_location_code: '0000000000',
        sublocation_code: '000',
        sublocation_name: 'Newly Added',
        location_name: 'Newly Added Asset',
        location_code: '000',
        precisionlocation_code: '0000',
        precisionlocation_name: 'Newly Added Asset',
        asset_id,
        serial_no,
        status,
        subType: subtype,
        type,
        last_annual_inspection: null,
        last_monthly_inspection: null,
      };
      if (type === 'fire_extinguisher' || type === 'scba_cylinder') {
        assetDoc.hydro_due = null;
      }
      if (trackHydro) {
        assetDoc.hydro_due = hydroDue;
      }
      await setDoc(doc(db, `clients/${clientId}/assets`, asset_id), assetDoc);
      const docRef = doc(db, `clients/${clientId}/asset_types`, 'types_in_use');
      const docSnap = await getDoc(docRef);
      let currentData = { Type: [], Subtype: [], UpdateLog: [] };
      if (docSnap.exists()) currentData = docSnap.data();
      if (!currentData.Subtype.includes(subtype)) {
        const updatedSubtypes = Array.from(new Set([...currentData.Subtype, subtype]));
        let logAction = `Added "${type}/${subtype}" by ${username} @ ${new Date().toLocaleString()}`;
        const updatedLog = currentData.UpdateLog ? [...currentData.UpdateLog, logAction] : [logAction];
        await updateDoc(docRef, {
          Subtype: updatedSubtypes,
          UpdateLog: updatedLog,
          updated_at: serverTimestamp(),
        });
      }
      setConfirmationOpen(false);
      setShowAddAssetModal(false);
      setAddAssetStep(1);
      setAssetForm({ type: '', subtype: '', serial_no: '', status: '', asset_id: '' });
      setNotification('Asset successfully created!');
      setTrackHydro(false);
      setHydroDue('');
    } catch (error) {
      setNotification('Error creating asset.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const cancelBtnStyle = {
    background: "#23263a",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "9px 22px",
    fontWeight: 600,
    fontSize: "1em",
    cursor: "pointer"
  };
  const confirmBtnStyle = {
    background: "#fdd835",
    color: "#23263a",
    border: "none",
    borderRadius: 7,
    padding: "9px 22px",
    fontWeight: 700,
    fontSize: "1em",
    cursor: "pointer"
  };

  if (assetsLoading || typesLoading) {
    return (
      <div style={{ width: '100%', height: '100%', padding: 0, margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#bfc3d1' }}>
          Loading {assetsLoading ? 'assets' : 'asset types'}...
        </div>
      </div>
    );
  }

  if (assetsError || typesError) {
    return (
      <div style={{ width: '100%', height: '100%', padding: 0, margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#ef4444' }}>
          Error loading {assetsError ? 'assets' : 'asset types'}: {(assetsError || typesError).message || (assetsError || typesError)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      <div className="luxury-panel-outer">
        <div className="luxury-panel-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0, padding: '0 0 1.5rem 0', gap: '0.8rem', flexWrap: 'wrap', border: 'none', background: 'none' }}>
            <div style={{ minWidth: '200px' }}>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffd700', letterSpacing: '0.04em', margin: 0 }}>
                Asset Management
              </h1>
              <p style={{ fontSize: '0.8rem', fontWeight: 400, color: '#bfc3d1', margin: 0 }}>
                {selectedType ? `${filteredAssets.length} assets` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: '1', maxWidth: '450px', minWidth: '180px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleAddAssetType}
                style={{
                  background: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: '6px',
                  padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: '400', color: '#ffd700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', letterSpacing: '0.02em'
                }}
              >
                <Plus size={14} />
                Add Asset Type
              </button>
              <button
                onClick={handleOpenAddAsset}
                style={{
                  background: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: '6px',
                  padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: '400', color: '#ffd700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', letterSpacing: '0.02em'
                }}
              >
                <Plus size={14} />
                Add Assets
              </button>
              {selectedType && (
                <button
                  onClick={() => setShowAddAssetModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 224, 102, 0.05))',
                    border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '6px',
                    padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: '500', color: '#ffd700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', letterSpacing: '0.02em'
                  }}
                >
                  <Plus size={16} />
                  Add {getAssetTypeDisplayName(selectedType)}
                </button>
              )}
            </div>
          </div>
          {!selectedType && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: '0.8rem', marginTop: '1rem', marginBottom: '2rem', width: '100%' }}>
              {assetTypes.filter(type => type && typeof type.label === 'string').map((type, idx) => {
                if (!type || !type.label) return null;
                let fontSize = '1.08rem';
                let letterSpacing = '0.01em';
                if (type.label.length > 15) fontSize = '0.95rem';
                if (type.label.length > 18) fontSize = '0.85rem';
                if (type.label.length > 22) fontSize = '0.75rem';
                if (type.label.length > 26) { fontSize = '0.68rem'; letterSpacing = '0'; }
                return (
                  <div key={type.type || idx}
                    className="nexus-asset-type-card"
                    style={{
                      background: 'rgba(24,28,44,0.92)', border: '1px solid #2a3441', borderRadius: '14px',
                      padding: '1.1rem 1.1rem 1rem 1.1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.13)', display: 'flex',
                      flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: 'fit-content',
                      minHeight: 0, transition: 'background 0.2s, border 0.2s', position: 'relative',
                      width: 'auto', maxWidth: 'none', flexShrink: 0
                    }}
                    onClick={() => setSelectedType(type.type)}
                  >
                    <div style={{ fontWeight: 700, color: '#ffd700', fontSize, letterSpacing, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', width: 'auto' }}>{type.label}</div>
                    <div style={{ color: '#bfc3d1', fontSize: '0.92rem', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap', width: 'auto' }}>{type.count} assets</div>
                  </div>
                );
              })}
            </div>
          )}
          {selectedType && (
            <>
              <button
                onClick={() => setSelectedType(null)}
                style={{
                  background: 'transparent', border: 'none', color: '#a0a3b8', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem', marginBottom: '1.2rem'
                }}
              >←</button>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#ffd700', margin: 0, letterSpacing: '0.02em' }}>
                  {getAssetTypeDisplayName(selectedType)}
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#bfc3d1', margin: '0.3rem 0 0 0', fontWeight: '500' }}>
                  {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <div style={{ width: '100%', padding: 0, margin: 0, flex: 1 }}>
                <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', background: 'none', margin: 0, border: 'none', boxShadow: 'none' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,224,102,0.13)' }}>
                      <th style={{ color: '#ffe066', fontWeight: '400', padding: '0.35rem 0.25rem', textAlign: 'left', fontSize: '0.95rem', letterSpacing: '0.05em', width: '20%', background: 'none', border: 'none' }}>Asset</th>
                      <th style={{ color: '#ffe066', fontWeight: '400', padding: '0.35rem 0.25rem', textAlign: 'left', fontSize: '0.95rem', letterSpacing: '0.05em', width: '15%', background: 'none', border: 'none' }}>Subtype</th>
                      <th style={{ color: '#ffe066', fontWeight: '400', padding: '0.35rem 0.25rem', textAlign: 'left', fontSize: '0.95rem', letterSpacing: '0.05em', width: '25%', background: 'none', border: 'none' }}>Location</th>
                      <th style={{ color: '#ffe066', fontWeight: '400', padding: '0.35rem 0.25rem', textAlign: 'left', fontSize: '0.95rem', letterSpacing: '0.05em', width: '15%', background: 'none', border: 'none' }}>Status</th>
                      <th style={{ color: '#ffe066', fontWeight: '400', padding: '0.35rem 0.25rem', textAlign: 'left', fontSize: '0.95rem', letterSpacing: '0.05em', width: '15%', background: 'none', border: 'none' }}>Last Updated</th>
                      <th style={{ color: '#ffe066', fontWeight: '400', padding: '0.35rem 0.25rem', textAlign: 'center', fontSize: '0.95rem', letterSpacing: '0.05em', width: '10%', background: 'none', border: 'none' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id} style={{ borderBottom: '1px solid rgba(255,224,102,0.08)', background: 'none' }}>
                        <td style={{ color: '#e3e6f6', padding: '0.44rem 0.3rem', fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'none', border: 'none' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#e3e6f6', fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {asset.id || 'Unknown Asset'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {asset.serial_no ? `S/N: ${asset.serial_no}` : 'No serial number'}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#e3e6f6', padding: '0.44rem 0.3rem', fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'none', border: 'none' }}>
                          <span style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700', padding: '0.13em 0.7em', borderRadius: '8px', fontSize: '0.92rem', fontWeight: '500', display: 'inline-block' }}>
                            {asset.subtype || 'No subtype'}
                          </span>
                        </td>
                        <td style={{ color: '#e3e6f6', padding: '0.44rem 0.3rem', fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'none', border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MapPin size={12} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', color: '#bfc3d1' }}>
                              {asset.location || asset.full_location || asset.location_id || 'No location'}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: '#e3e6f6', padding: '0.44rem 0.3rem', fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'none', border: 'none' }}>
                          <span style={{
                            background: asset.status === true ? 'rgba(255,215,0,0.15)' : asset.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)',
                            color: asset.status === true ? '#ffd700' : asset.status === 'failed' ? '#ef4444' : '#bfc3d1',
                            border: `1px solid ${asset.status === true ? 'rgba(255,215,0,0.3)' : asset.status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: '8px', padding: '0.13em 0.7em', fontSize: '0.92rem', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                          }}>
                            {asset.status === true ? '●' : asset.status === 'failed' ? '⚠' : '○'} {asset.status === true ? 'active' : asset.status === 'failed' ? 'failed' : 'inactive'}
                          </span>
                        </td>
                        <td style={{ color: '#e3e6f6', padding: '0.44rem 0.3rem', fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'none', border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={12} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', color: '#bfc3d1' }}>
                              {asset.last_updated ? new Date(asset.last_updated).toLocaleDateString() : 'Never'}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: '#e3e6f6', padding: '0.44rem 0.3rem', fontSize: '0.98rem', textAlign: 'center', background: 'none', border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                            <button
                              style={{
                                background: '#23263a', color: '#ffd700', border: '1.2px solid #ffd700', borderRadius: 6, padding: '3px 13px',
                                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center'
                              }}
                              onClick={() => {
                                setPendingAsset(asset);
                                setMoveTypeModalOpen(true);
                              }}
                              title="Move Asset"
                            >
                              <Move size={15} style={{ marginRight: 4, marginBottom: -2 }} /> Move
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Move Modal Logic */}
      {moveTypeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#23263a', borderRadius: 14, padding: '2em 2.5em', boxShadow: '0 8px 40px #000b', minWidth: 320, maxWidth: 380 }}>
            <h3 style={{ color: '#ffd700', marginBottom: 22, fontWeight: 700, fontSize: '1.12em', textAlign: 'center' }}>What kind of move would you like to perform?</h3>
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
              <button
                style={{ background: '#fdd835', color: '#23263a', border: 'none', borderRadius: 7, padding: '0.9em 1.5em', fontWeight: 700, fontSize: '1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  setMoveType('single');
                  setMoveTypeModalOpen(false);
                }}
              >
                Single <span style={{ fontSize: '1.2em' }}>→</span>
              </button>
              <button
                style={{ background: '#23263a', color: '#ffd700', border: '1.2px solid #ffd700', borderRadius: 7, padding: '0.9em 1.5em', fontWeight: 700, fontSize: '1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  setMoveType('swap');
                  setMoveTypeModalOpen(false);
                  setSwapSelectModalOpen(true);
                }}
              >
                Swap <span style={{ fontSize: '1.15em', display: 'flex', alignItems: 'center' }}>⇄</span>
              </button>
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button onClick={() => { setMoveTypeModalOpen(false); setPendingAsset(null); }} style={{ color: '#bfc3d1', background: 'none', border: 'none', fontSize: '1em', marginTop: 4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {moveType === 'single' && pendingAsset && (
        <MoveAssetModal
          open={true}
          asset={pendingAsset}
          clientId={clientId}
          locations={locations}
          onClose={() => { setMoveType(null); setPendingAsset(null); }}
          onMoved={() => {
            setMoveType(null); setPendingAsset(null); setNotification('Asset moved!');
            // Reload assets if needed
          }}
          adminUsername={currentUser.displayName || "admin@nexus"}
        />
      )}
      {swapSelectModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#23263a', borderRadius: 14, padding: '2em 2.5em', boxShadow: '0 8px 40px #000b', minWidth: 320, maxWidth: 480 }}>
            <h3 style={{ color: '#ffd700', marginBottom: 18, fontWeight: 700, fontSize: '1.11em', textAlign: 'center' }}>Select an asset to swap with:</h3>
            <div style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  {assets.filter(a => a.id !== pendingAsset.id).map(asset => (
                    <tr key={asset.id}>
                      <td style={{ color: '#e3e6f6', padding: '0.5em 0.5em' }}>
                        <span style={{ fontWeight: 600 }}>{asset.id}</span>
                        <span style={{ color: '#ffd700', marginLeft: 10 }}>{asset.type}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setSwapWithAsset(asset);
                            setSwapSelectModalOpen(false);
                            setMoveType('swap-confirm');
                          }}
                          style={{ background: '#ffd700', color: '#23263a', border: 'none', borderRadius: 6, padding: '0.6em 1.4em', fontWeight: 700, cursor: 'pointer' }}
                        >Swap</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { setSwapSelectModalOpen(false); setPendingAsset(null); setMoveType(null); }} style={{ color: '#bfc3d1', background: 'none', border: 'none', fontSize: '1em' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {moveType === 'swap-confirm' && pendingAsset && swapWithAsset && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1c1f31', padding: '2em', borderRadius: 14, minWidth: 340, maxWidth: 460, boxShadow: '0 8px 40px #000b', color: '#ffd700' }}>
            <h3 style={{ marginBottom: 14 }}>Confirm Asset Swap</h3>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <div>
                <strong>{pendingAsset.id}</strong> ({pendingAsset.type})<br />
                <span style={{ fontSize: '1.5em' }}>⇄</span><br />
                <strong>{swapWithAsset.id}</strong> ({swapWithAsset.type})
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => {
                setMoveType(null); setPendingAsset(null); setSwapWithAsset(null);
              }} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await moveAsset({
                      db,
                      clientId,
                      assetId: pendingAsset.id,
                      newLocation: {
                        locationId: swapWithAsset.locationId,
                        locationName: swapWithAsset.locationName,
                        locationCode: swapWithAsset.locationCode,
                        sublocationId: swapWithAsset.sublocationId,
                        sublocationName: swapWithAsset.sublocationName,
                        sublocationCode: swapWithAsset.sublocationCode,
                        precisionId: swapWithAsset.precisionId,
                        precisionName: swapWithAsset.precisionName,
                        precisionCode: swapWithAsset.precisionCode
                      },
                      adminUsername: currentUser.displayName || "admin@nexus",
                      swapAssetId: swapWithAsset.id
                    });
                    setMoveType(null); setPendingAsset(null); setSwapWithAsset(null); setNotification('Assets swapped!');
                    // Reload assets if needed
                  } catch (e) {
                    setNotification('Error swapping assets: ' + (e.message || ''));
                    setTimeout(() => setNotification(null), 3000);
                  }
                }}
                style={confirmBtnStyle}
              >Confirm Swap</button>
            </div>
          </div>
        </div>
      )}
      {notification && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          background: '#4CAF50', color: 'white', padding: '15px',
          borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', zIndex: 10001,
          opacity: 1, transition: 'opacity 0.5s ease-in-out'
        }}>{notification}</div>
      )}
    </div>
  );
}

export default AssetManagement;

