import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, GripVertical } from 'lucide-react';

// A mobile-only floating action button for quick Owner Entry access.
// - Draggable within viewport; position persisted to localStorage
// - Hide/show togglable; hidden state persisted
// - On tap opens a half-height bottom sheet with quick actions

const STORAGE_KEY_POS = 'floating_owner_entry_pos';
const STORAGE_KEY_VIS = 'floating_owner_entry_visible';

export const FloatingOwnerEntry: React.FC = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VIS);
      return raw == null ? true : raw === '1';
    } catch {
      return true;
    }
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pos, setPos] = useState<{ xPct: number; yPct: number }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_POS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.xPct === 'number' && typeof parsed?.yPct === 'number') {
          return parsed;
        }
      }
    } catch {}
    return { xPct: 88, yPct: 78 };
  });
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VIS, visible ? '1' : '0');
    } catch {}
  }, [visible]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(pos));
    } catch {}
  }, [pos]);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const startDrag = (clientX: number, clientY: number) => {
    draggingRef.current = true;
    updatePos(clientX, clientY);
  };

  const updatePos = (clientX: number, clientY: number) => {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    if (!vw || !vh) return;
    const xPct = clamp((clientX / vw) * 100, 4, 96);
    const yPct = clamp((clientY / vh) * 100, 6, 92);
    setPos({ xPct, yPct });
  };

  const endDrag = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    const onMove = (e: TouchEvent | MouseEvent) => {
      if (!draggingRef.current) return;
      if ('touches' in e) {
        const t = e.touches[0];
        updatePos(t.clientX, t.clientY);
      } else {
        updatePos((e as MouseEvent).clientX, (e as MouseEvent).clientY);
      }
    };
    const onUp = () => endDrag();
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onUp);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('touchend', onUp as any);
      window.removeEventListener('mouseup', onUp as any);
    };
  }, []);

  if (!visible) {
    return (
      <button
        type="button"
        className="fixed z-[60] bottom-16 left-2 md:hidden px-2 py-1 text-[10px] rounded-full bg-gray-900 text-white/90 shadow"
        onClick={() => setVisible(true)}
        aria-label="Show Owner Entry Button"
      >
        Show
      </button>
    );
  }

  return (
    <>
      {/* Floating Button (mobile-only) */}
      <div
        ref={containerRef}
        className="fixed md:hidden z-[60]"
        style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="relative">
          {/* Drag handle */}
          <button
            type="button"
            className="absolute -top-3 -left-3 p-1 rounded-full bg-white shadow border text-gray-700"
            onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
            onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
            aria-label="Drag Owner Entry Button"
          >
            <GripVertical className="h-3 w-3" />
          </button>

          {/* Hide */}
          <button
            type="button"
            className="absolute -top-3 -right-3 p-1 rounded-full bg-white shadow border text-gray-700"
            onClick={() => setVisible(false)}
            aria-label="Hide Owner Entry Button"
          >
            <X className="h-3 w-3" />
          </button>

          {/* Main FAB */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition flex items-center justify-center"
            aria-label="Open Owner Entry Quick Actions"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Half-height bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white rounded-t-2xl shadow-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="h-1.5 w-12 bg-gray-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="font-semibold">Quick Actions</span>
              <button type="button" className="p-2 -mr-2" onClick={() => setSheetOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 space-y-3">
              <button
                type="button"
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold shadow active:scale-98"
                onClick={() => { setSheetOpen(false); navigate('/owner-entry'); }}
              >
                Go to Owner Entry
              </button>
              <div className="text-xs text-muted-foreground">
                Tip: drag the floating button by the handle to reposition it.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingOwnerEntry;


