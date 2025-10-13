// Date utility functions
export const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());

export const parseYMD = (value: string): Date | null => {
  if (!value || typeof value !== 'string') return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return isValidDate(dt) ? dt : null;
};

export const toYMD = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const todayYMD = () => toYMD(new Date());

export const yesterdayYMD = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toYMD(d);
};

export const getDisplayDate = (selectedDateOption: string, customEntryDate: string) => {
  switch (selectedDateOption) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'custom': {
      const parsed = parseYMD(customEntryDate);
      return parsed ? parsed.toLocaleDateString() : 'Select date';
    }
    default:
      return 'Today';
  }
};
