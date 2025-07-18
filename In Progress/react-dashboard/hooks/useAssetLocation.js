import { useMutation, useQuery, useQueryClient } from 'react-query';
import { db } from '../lib/firebaseUtils'; // adjust path as needed
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import useClientStore from '../store/clientStore';

// Fetch all assets in a location
export function useAssetsByLocation(locationId) {
  const { clientId } = useClientStore();
  return useQuery([
    'assetsByLocation',
    clientId,
    locationId
  ], async () => {
    const locRef = doc(db, `clients/${clientId}/locations/${locationId}`);
    const locSnap = await getDoc(locRef);
    return locSnap.exists() ? locSnap.data().assets || [] : [];
  });
}

// Fetch location info for an asset
export function useLocationOfAsset(assetId) {
  const { clientId } = useClientStore();
  return useQuery([
    'locationOfAsset',
    clientId,
    assetId
  ], async () => {
    const assetRef = doc(db, `clients/${clientId}/assets/${assetId}`);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return null;
    const { Location, Sublocation, PrecisionLocation } = assetSnap.data();
    return { Location, Sublocation, PrecisionLocation };
  });
}

// Move asset: update both asset doc and location arrays
export function useMoveAsset() {
  const { clientId } = useClientStore();
  const queryClient = useQueryClient();
  return useMutation(
    async ({ assetId, oldLoc, oldSub, oldPrec, newLoc, newSub, newPrec }) => {
      // 1. Update asset doc
      const assetRef = doc(db, `clients/${clientId}/assets/${assetId}`);
      await updateDoc(assetRef, {
        Location: newLoc,
        Sublocation: newSub,
        PrecisionLocation: newPrec,
      });
      // 2. Remove asset from old location arrays
      if (oldLoc) {
        const oldLocRef = doc(db, `clients/${clientId}/locations/${oldLoc}`);
        await updateDoc(oldLocRef, { assets: arrayRemove(assetId) });
      }
      if (oldSub) {
        const oldSubRef = doc(db, `clients/${clientId}/sublocations/${oldSub}`);
        await updateDoc(oldSubRef, { assets: arrayRemove(assetId) });
      }
      if (oldPrec) {
        const oldPrecRef = doc(db, `clients/${clientId}/precisionLocations/${oldPrec}`);
        await updateDoc(oldPrecRef, { assets: arrayRemove(assetId) });
      }
      // 3. Add asset to new location arrays
      if (newLoc) {
        const newLocRef = doc(db, `clients/${clientId}/locations/${newLoc}`);
        await updateDoc(newLocRef, { assets: arrayUnion(assetId) });
      }
      if (newSub) {
        const newSubRef = doc(db, `clients/${clientId}/sublocations/${newSub}`);
        await updateDoc(newSubRef, { assets: arrayUnion(assetId) });
      }
      if (newPrec) {
        const newPrecRef = doc(db, `clients/${clientId}/precisionLocations/${newPrec}`);
        await updateDoc(newPrecRef, { assets: arrayUnion(assetId) });
      }
    },
    {
      onSuccess: (_, { assetId, newLoc, newSub, newPrec }) => {
        // Invalidate both sides so UI updates everywhere
        queryClient.invalidateQueries(['assetsByLocation']);
        queryClient.invalidateQueries(['locationOfAsset', clientId, assetId]);
        if (newLoc) queryClient.invalidateQueries(['assetsByLocation', clientId, newLoc]);
        if (newSub) queryClient.invalidateQueries(['assetsByLocation', clientId, newSub]);
        if (newPrec) queryClient.invalidateQueries(['assetsByLocation', clientId, newPrec]);
      }
    }
  );
}
