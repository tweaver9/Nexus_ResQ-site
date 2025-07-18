import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// Pass in the current clientId (e.g., "spacex")
export function useAssets(clientId) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setAssets([]);
      setLoading(false);
      setError('No clientId provided');
      return;
    }

    setLoading(true);
    setError(null);

    // Enforce client-specific Firestore path
    const assetsRef = collection(db, `clients/${clientId.toLowerCase()}/assets`);
    getDocs(assetsRef)
      .then(snapshot => {
        const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAssets(assetsData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load assets');
        setLoading(false);
      });
  }, [clientId]);

  return { assets, loading, error };
}