// Vehicle utility functions
export const normalizeTypeString = (value: any): string => String(value ?? '').trim();

export const mapTypeToWheelCategory = (typeString: string): string => {
  const t = normalizeTypeString(typeString);
  
  // Handle numeric codes
  if (t === '3') return 'other';
  if (t === '2') return '2';
  if (t === '4' || t === '1') return '4';
  
  // Handle actual vehicle type strings
  if (t.toLowerCase().includes('above 300cc') || t.toLowerCase().includes('300cc')) return 'other';
  if (t.toLowerCase().includes('2 wheeler') || t.toLowerCase().includes('2-wheeler')) return '2';
  if (t.toLowerCase().includes('4 wheeler') || t.toLowerCase().includes('4-wheeler') || t.toLowerCase().includes('car')) return '4';
  
  return '';
};

export const mapWheelCategoryToTypeCode = (wheelCat: string): string | null => {
  if (wheelCat === 'other') return null; // Return null for 'other' to maintain DB consistency
  if (wheelCat === '2') return '2';
  if (wheelCat === '4') return '4';
  return null;
};

export const doesTypeMatchWheelCategory = (typeString: string | undefined | null, wheelCat: string): boolean => {
  const t = normalizeTypeString(typeString);
  if (!wheelCat) return true;
  if (wheelCat === 'other') return t === '3' || t === 'NULL' || t === '';
  if (wheelCat === '2') return t === '2';
  if (wheelCat === '4') return t === '4' || t === '1';
  return false;
};

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback (not cryptographically secure)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
