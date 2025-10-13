import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useEditMode = () => {
  const [pendingEditData, setPendingEditData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLogId, setEditLogId] = useState<string | null>(null);

  // Check for edit data on component mount
  useEffect(() => {
    const editData = sessionStorage.getItem('editLogData');
    if (editData) {
      try {
        const logData = JSON.parse(editData);
        console.log('Edit data found:', logData);
        setPendingEditData(logData);
        sessionStorage.removeItem('editLogData');
      } catch (error) {
        console.error('Error parsing edit data:', error);
        toast.error('Error loading edit data');
      }
    }
  }, []);

  const resetEditMode = () => {
    setIsEditing(false);
    setEditLogId(null);
    setPendingEditData(null);
  };

  return {
    pendingEditData,
    isEditing,
    editLogId,
    setIsEditing,
    setEditLogId,
    setPendingEditData,
    resetEditMode
  };
};

