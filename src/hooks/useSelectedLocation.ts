import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Custom hook to manage selected location state across payroll pages
 * This ensures all pages react to location changes in real-time
 */
export function useSelectedLocation() {
  const { user } = useAuth();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Get the appropriate location ID based on user role
  const getLocationId = () => {
    if (!user?.id) return '';
    
    // For managers, always use their assigned location
    if (user.role === 'manager' && user.assigned_location) {
      return user.assigned_location;
    }
    
    // For owners, get from localStorage
    try {
      return localStorage.getItem(`selectedLocation_${user.id}`) || '';
    } catch (_) {
      return '';
    }
  };

  // Update selected location when user changes or on mount
  useEffect(() => {
    const locationId = getLocationId();
    setSelectedLocationId(locationId);
  }, [user?.id, user?.role, user?.assigned_location]);

  // Listen for localStorage changes (when location is changed in PayrollLayout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `selectedLocation_${user?.id}` && e.newValue !== null) {
        setSelectedLocationId(e.newValue);
      }
    };

    // Listen for storage events (changes from other tabs/components)
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (changes within same tab)
    const handleCustomLocationChange = (e: CustomEvent) => {
      if (e.detail.userId === user?.id) {
        setSelectedLocationId(e.detail.locationId);
      }
    };

    window.addEventListener('locationChanged', handleCustomLocationChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('locationChanged', handleCustomLocationChange as EventListener);
    };
  }, [user?.id]);

  return selectedLocationId;
}
