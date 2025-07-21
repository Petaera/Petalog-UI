
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Save, Undo, Trash2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { toast } from 'sonner';

interface ScratchMarkingProps {
  onSave: (imageBlob: Blob) => void;
}

export const ScratchMarking = ({ onSave }: ScratchMarkingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });
  const [originalImageDimensions, setOriginalImageDimensions] = useState({ width: 0, height: 0 });
  const selectedImage = '/uploads/3786d68b-afbe-4a2d-91cb-0ca2cb589288.png';
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [markingsImage, setMarkingsImage] = useState<HTMLCanvasElement | null>(null);

  // Helper to create or get the markings canvas
  const getMarkingsCanvas = (width: number, height: number) => {
    let canvas = markingsImage;
    if (!canvas || canvas.width !== width || canvas.height !== height) {
      const newCanvas = document.createElement('canvas');
      newCanvas.width = width;
      newCanvas.height = height;
      // Copy old markings if possible
      if (canvas) {
        const ctx = newCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, width, height);
        }
      }
      setMarkingsImage(newCanvas);
      canvas = newCanvas;
    }
    return canvas;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setContext(ctx);

    // Load the selected car diagram image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImageDimensions({ width: img.width, height: img.height });
      const container = containerRef.current;
      const containerWidth = container ? container.clientWidth - 32 : 600;
      const maxWidth = Math.min(containerWidth, 600);
      const maxHeight = 400;
      const aspectRatio = img.width / img.height;
      let canvasWidth, canvasHeight;
      if (aspectRatio > maxWidth / maxHeight) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / aspectRatio;
      } else {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
      }
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      redrawCanvas(img, canvasWidth, canvasHeight);
      setImageLoaded(true);
    };
    img.src = selectedImage;
  }, [selectedImage, pan.x, pan.y, scale]);

  // Add event listeners for spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    let newScale = scale;
    if (e.deltaY < 0) {
      newScale = Math.min(scale + zoomIntensity, 3);
    } else {
      newScale = Math.max(scale - zoomIntensity, 0.5);
    }
    // Zoom to mouse position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const wx = (mouseX - pan.x) / scale;
    const wy = (mouseY - pan.y) / scale;
    setScale(newScale);
    setPan({
      x: mouseX - wx * newScale,
      y: mouseY - wy * newScale
    });
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if ((e.button === 2) || isSpacePressed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    startDrawing(e);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && dragStart) {
      setPan(prev => ({
        x: prev.x + (e.clientX - dragStart.x),
        y: prev.y + (e.clientY - dragStart.y)
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    draw(e);
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }
    stopDrawing();
  };
  // Prevent context menu on right click
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  // Redraw both background and markings
  const redrawCanvas = (img: HTMLImageElement, width: number, height: number) => {
    if (!context) return;
    // Save the current transform
    context.save();
    // Clear the entire canvas
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    // Apply pan and scale transforms
    context.translate(pan.x, pan.y);
    context.scale(scale, scale);
    // Draw the image
    context.drawImage(img, 0, 0, width, height);
    // Draw the markings
    const markingsCanvas = getMarkingsCanvas(width, height);
    context.drawImage(markingsCanvas, 0, 0, width, height);
    // Restore transform for drawing
    context.restore();
    // Set drawing properties with red color
    context.strokeStyle = '#ef4444';
    context.lineWidth = 3 / scale; // Adjust line width for zoom
    context.lineCap = 'round';
    context.lineJoin = 'round';
  };

  const getEventPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    const clientX = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY;
    
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top - pan.y) / scale
    };
  };

  // Drawing logic: draw on the markings canvas, then redraw everything
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context || !imageLoaded) return;
    e.preventDefault();
    if ('touches' in e && e.touches.length > 1) {
      setIsPanning(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      setLastPan({
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      });
      return;
    }
    // Ensure red color is set before drawing
    setIsDrawing(true);
    const pos = getEventPos(e);
    // Draw on the markings canvas
    const markingsCanvas = getMarkingsCanvas(canvasRef.current!.width, canvasRef.current!.height);
    const markingsCtx = markingsCanvas.getContext('2d');
    if (!markingsCtx) return;
    markingsCtx.save();
    markingsCtx.translate(pan.x, pan.y);
    markingsCtx.scale(scale, scale);
    markingsCtx.strokeStyle = '#ef4444';
    markingsCtx.lineWidth = 3 / scale;
    markingsCtx.lineCap = 'round';
    markingsCtx.lineJoin = 'round';
    markingsCtx.beginPath();
    markingsCtx.moveTo(pos.x, pos.y);
    markingsCtx.restore();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if ('touches' in e && e.touches.length > 1 && isPanning) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      setPan(prev => ({
        x: prev.x + (currentCenter.x - lastPan.x),
        y: prev.y + (currentCenter.y - lastPan.y)
      }));
      setLastPan(currentCenter);
      return;
    }
    if (!isDrawing || !context) return;
    const pos = getEventPos(e);
    // Draw on the markings canvas
    const markingsCanvas = getMarkingsCanvas(canvasRef.current!.width, canvasRef.current!.height);
    const markingsCtx = markingsCanvas.getContext('2d');
    if (!markingsCtx) return;
    markingsCtx.save();
    markingsCtx.translate(pan.x, pan.y);
    markingsCtx.scale(scale, scale);
    markingsCtx.strokeStyle = '#ef4444';
    markingsCtx.lineWidth = 3 / scale;
    markingsCtx.lineCap = 'round';
    markingsCtx.lineJoin = 'round';
    markingsCtx.lineTo(pos.x, pos.y);
    markingsCtx.stroke();
    markingsCtx.restore();
    // Redraw everything
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      redrawCanvas(img, canvasRef.current!.width, canvasRef.current!.height);
    };
    img.src = selectedImage;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setIsPanning(false);
    if (context) {
      context.beginPath();
    }
  };

  // Update markings when image or canvas size changes
  useEffect(() => {
    if (!canvasRef.current) return;
    getMarkingsCanvas(canvasRef.current.width, canvasRef.current.height);
  }, [selectedImage, canvasRef.current?.width, canvasRef.current?.height]);

  const handleZoom = (direction: 'in' | 'out') => {
    const zoomFactor = 0.2;
    const newScale = direction === 'in' 
      ? Math.min(scale + zoomFactor, 3) 
      : Math.max(scale - zoomFactor, 0.5);
    
    setScale(newScale);
    
    // Redraw with new scale
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      redrawCanvas(img, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
    };
    img.src = selectedImage;
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      redrawCanvas(img, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
    };
    img.src = selectedImage;
  };

  // Clear markings when clearing canvas
  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    setScale(1);
    setPan({ x: 0, y: 0 });
    // Clear markings
    const markingsCanvas = getMarkingsCanvas(canvasRef.current.width, canvasRef.current.height);
    const markingsCtx = markingsCanvas.getContext('2d');
    if (markingsCtx) {
      markingsCtx.clearRect(0, 0, markingsCanvas.width, markingsCanvas.height);
    }
    // Reload the original image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      redrawCanvas(img, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
    };
    img.src = selectedImage;
    toast.success('Canvas cleared');
  };

  // Save both image and markings
  const saveImage = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onSave(blob);
        toast.success('Scratch markings saved!');
      }
    }, 'image/png');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Scratch Marking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          ref={containerRef}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-2 bg-muted/20 flex justify-center overflow-hidden relative"
        >
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto border rounded cursor-crosshair touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={handleContextMenu}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ 
              touchAction: 'none',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0'
            }}
          />
        </div>

        {/* Mobile-friendly controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={saveImage}
              disabled={!imageLoaded}
              className="flex-shrink-0"
            >
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Save Markings</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              disabled={!imageLoaded}
              className="flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
          </div>

          {/* Zoom and pan controls for mobile */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('out')}
              disabled={!imageLoaded || scale <= 0.5}
              className="flex-shrink-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('in')}
              disabled={!imageLoaded || scale >= 3}
              className="flex-shrink-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
              disabled={!imageLoaded}
              className="flex-shrink-0"
            >
              <Move className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>

        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="block sm:hidden">Touch to draw red marks on the car diagram. Use pinch gestures to zoom and drag to pan. Use the zoom controls below for precise marking.</span>
            <span className="hidden sm:block">Draw directly on the car diagram to mark scratches or damages. Use your mouse to draw red lines. Use zoom controls for detailed marking. The marked image will be saved with the entry.</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
