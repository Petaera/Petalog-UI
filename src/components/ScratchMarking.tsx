
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Save, Undo, Trash2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { toast } from 'sonner';

interface ScratchMarkingProps {
  onSave: (imageData: string) => void;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setContext(ctx);

    // Load the new car diagram image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Store original dimensions
      setOriginalImageDimensions({ width: img.width, height: img.height });
      
      // Set canvas dimensions to maintain aspect ratio for mobile
      const container = containerRef.current;
      const containerWidth = container ? container.clientWidth - 32 : 600; // Account for padding
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
    img.src = '/lovable-uploads/3786d68b-afbe-4a2d-91cb-0ca2cb589288.png';
  }, []);

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context || !imageLoaded) return;
    e.preventDefault();
    
    if ('touches' in e && e.touches.length > 1) {
      // Multi-touch for panning
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
    context.strokeStyle = '#ef4444';
    context.lineWidth = 3 / scale;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    setIsDrawing(true);
    const pos = getEventPos(e);
    
    context.save();
    context.translate(pan.x, pan.y);
    context.scale(scale, scale);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    context.restore();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if ('touches' in e && e.touches.length > 1 && isPanning) {
      // Handle panning
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
    
    context.save();
    context.translate(pan.x, pan.y);
    context.scale(scale, scale);
    context.lineTo(pos.x, pos.y);
    context.stroke();
    context.restore();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setIsPanning(false);
    if (context) {
      context.beginPath();
    }
  };

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
    img.src = '/lovable-uploads/3786d68b-afbe-4a2d-91cb-0ca2cb589288.png';
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      redrawCanvas(img, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
    };
    img.src = '/lovable-uploads/3786d68b-afbe-4a2d-91cb-0ca2cb589288.png';
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    
    // Reset zoom and pan
    setScale(1);
    setPan({ x: 0, y: 0 });
    
    // Reload the original image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      redrawCanvas(img, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
    };
    img.src = '/lovable-uploads/3786d68b-afbe-4a2d-91cb-0ca2cb589288.png';
    
    toast.success('Canvas cleared');
  };

  const saveImage = () => {
    if (!canvasRef.current) return;
    
    const imageData = canvasRef.current.toDataURL('image/png');
    onSave(imageData);
    toast.success('Scratch markings saved!');
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
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
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
