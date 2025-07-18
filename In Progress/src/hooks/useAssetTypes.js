import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useAssetTypes = (clientId) => {
  const [assetTypes, setAssetTypes] = useState([]);
  const [subtypes, setSubtypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssetTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!clientId) {
          setAssetTypes([]);
          setSubtypes([]);
          setLoading(false);
          setError('No clientId provided');
          return;
        }
        const docRef = doc(db, `clients/${clientId}/asset_types`, 'types_in_use');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAssetTypes(data.Type || []);
          setSubtypes(data.Subtype || []);
        } else {
          setAssetTypes([]);
          setSubtypes([]);
        }
      } catch (err) {
        console.error('Error fetching asset types:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetTypes();
  }, [clientId]);

  return { assetTypes, subtypes, loading, error };
};
