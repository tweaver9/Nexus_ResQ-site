// moveAsset.js
import { doc, updateDoc, getDoc, arrayRemove, arrayUnion, serverTimestamp, runTransaction, collection, addDoc } from "firebase/firestore";

/**
 * Moves or swaps an asset (or two) between locations, updating all references and logging every step.
 * @param {Object} params
 * @param {object} params.db - Firebase Firestore instance
 * @param {string} params.clientId - The client ID/root collection
 * @param {string} params.assetId - The asset being moved
 * @param {object} params.newLocation - { locationId, locationName, locationCode, sublocationId, sublocationName, sublocationCode, precisionId, precisionName, precisionCode }
 * @param {string} params.adminUsername - Name of admin performing the action
 * @param {string} [params.swapAssetId] - Optional: assetId of asset to swap with
 */
export async function moveAsset({ db, clientId, assetId, newLocation, adminUsername, swapAssetId }) {
  const assetsCol = `clients/${clientId}/assets`;
  const locCol = `clients/${clientId}/locations`;
  const logCol = `clients/${clientId}/logs`;

  // Fetch asset docs (both if swap)
  const assetDocRef = doc(db, assetsCol, assetId);
  const assetSnap = await getDoc(assetDocRef);
  if (!assetSnap.exists()) throw new Error("Asset not found");
  const assetData = assetSnap.data();

  let swapAssetData, swapAssetDocRef;
  if (swapAssetId) {
    swapAssetDocRef = doc(db, assetsCol, swapAssetId);
    const swapSnap = await getDoc(swapAssetDocRef);
    if (!swapSnap.exists()) throw new Error("Swap asset not found");
    swapAssetData = swapSnap.data();
  }

  // Helper to update location arrays (removal and addition)
  async function updateLocationAssetArray(locId, assetId, action) {
    if (!locId) return;
    const locDocRef = doc(db, locCol, locId);
    const locSnap = await getDoc(locDocRef);
    if (!locSnap.exists()) return;
    const assetsArray = locSnap.data().assets || [];
    let newArr;
    if (action === 'remove') newArr = assetsArray.filter(id => id !== assetId);
    if (action === 'add' && !assetsArray.includes(assetId)) newArr = [...assetsArray, assetId];
    if (newArr) await updateDoc(locDocRef, { assets: newArr });
  }

  // Helper to log move event
  async function logStep(detail) {
    await addDoc(collection(db, logCol), {
      type: "asset_move",
      performed_by: adminUsername,
      assetId,
      timestamp: serverTimestamp(),
      detail,
    });
  }

  // Helper for swap log
  async function logSwapStep(detail, swapId) {
    await addDoc(collection(db, logCol), {
      type: "asset_swap",
      performed_by: adminUsername,
      assetId,
      swapWith: swapId,
      timestamp: serverTimestamp(),
      detail,
    });
  }

  // Single move logic
  if (!swapAssetId) {
    // Remove from old locations (all levels)
    await updateLocationAssetArray(assetData.locationId, assetId, "remove");
    await updateLocationAssetArray(assetData.sublocationId, assetId, "remove");
    await updateLocationAssetArray(assetData.precisionId, assetId, "remove");

    // Add to new locations (all levels)
    await updateLocationAssetArray(newLocation.locationId, assetId, "add");
    await updateLocationAssetArray(newLocation.sublocationId, assetId, "add");
    await updateLocationAssetArray(newLocation.precisionId, assetId, "add");

    // Update asset's location fields
    await updateDoc(assetDocRef, {
      ...newLocation,
      last_moved_by: adminUsername,
      last_moved_at: serverTimestamp(),
    });

    await logStep(
      `Moved asset ${assetId} to Location:${newLocation.locationName}/${newLocation.sublocationName}/${newLocation.precisionName}`
    );
    return;
  }

  // Swap logic (move two assets at once)
  // Remove pendingAsset from its locations
  await updateLocationAssetArray(assetData.locationId, assetId, "remove");
  await updateLocationAssetArray(assetData.sublocationId, assetId, "remove");
  await updateLocationAssetArray(assetData.precisionId, assetId, "remove");
  // Remove swapWithAsset from its locations
  await updateLocationAssetArray(swapAssetData.locationId, swapAssetId, "remove");
  await updateLocationAssetArray(swapAssetData.sublocationId, swapAssetId, "remove");
  await updateLocationAssetArray(swapAssetData.precisionId, swapAssetId, "remove");
  // Add assetId to swapWithAsset's locations
  await updateLocationAssetArray(swapAssetData.locationId, assetId, "add");
  await updateLocationAssetArray(swapAssetData.sublocationId, assetId, "add");
  await updateLocationAssetArray(swapAssetData.precisionId, assetId, "add");
  // Add swapAssetId to assetId's old locations
  await updateLocationAssetArray(assetData.locationId, swapAssetId, "add");
  await updateLocationAssetArray(assetData.sublocationId, swapAssetId, "add");
  await updateLocationAssetArray(assetData.precisionId, swapAssetId, "add");

  // Update both assets' location fields
  await updateDoc(assetDocRef, {
    ...{
      locationId: swapAssetData.locationId,
      locationName: swapAssetData.locationName,
      locationCode: swapAssetData.locationCode,
      sublocationId: swapAssetData.sublocationId,
      sublocationName: swapAssetData.sublocationName,
      sublocationCode: swapAssetData.sublocationCode,
      precisionId: swapAssetData.precisionId,
      precisionName: swapAssetData.precisionName,
      precisionCode: swapAssetData.precisionCode,
    },
    last_moved_by: adminUsername,
    last_moved_at: serverTimestamp(),
  });
  await updateDoc(swapAssetDocRef, {
    ...{
      locationId: assetData.locationId,
      locationName: assetData.locationName,
      locationCode: assetData.locationCode,
      sublocationId: assetData.sublocationId,
      sublocationName: assetData.sublocationName,
      sublocationCode: assetData.sublocationCode,
      precisionId: assetData.precisionId,
      precisionName: assetData.precisionName,
      precisionCode: assetData.precisionCode,
    },
    last_moved_by: adminUsername,
    last_moved_at: serverTimestamp(),
  });

  await logSwapStep(
    `Swapped asset ${assetId} and ${swapAssetId}. ${assetId} moved to ${swapAssetData.locationName}/${swapAssetData.sublocationName}/${swapAssetData.precisionName}, and ${swapAssetId} moved to ${assetData.locationName}/${assetData.sublocationName}/${assetData.precisionName}`,
    swapAssetId
  );
}
