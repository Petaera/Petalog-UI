// src/hooks/usePlans.js
import { useEffect, useState } from 'react';
import { fetchPlans } from '../lib/api';

export default function usePlans(ownerId) {
  const [plans, setPlans] = useState([]);
  useEffect(() => {
    if (!ownerId) return;
    let mounted = true;
    (async () => {
      try {
        const data = await fetchPlans(ownerId);
        if (mounted) setPlans(data || []);
      } catch (err) {
        console.error('fetchPlans error', err);
      }
    })();
    return () => { mounted = false; };
  }, [ownerId]);
  return plans;
}
