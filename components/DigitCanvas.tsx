import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { CANVAS_SIZE, EXPORT_SIZE, STROKE_WIDTH } from '../constants';
import { DigitCanvasHandle } from '../types';

interface DigitCanvasProps {
  digit: number;
}

const DigitCanvas = forwardRef<DigitCanvasHandle, DigitCanvasProps>(({ digit }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // Initialize canvas with white background
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing styles
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    setHasContent(false);
  };

  useEffect(() => {
    initCanvas();
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    clear: () => {
      initCanvas();
    },
    getData: async () => {
      const sourceCanvas = canvasRef.current;
      if (!sourceCanvas) return { blob: null, isEmpty: true };

      // Check if visually empty (basic check: has user interacted? 
      // More robust: check pixel data on the small canvas)
      
      // 1. Create offscreen canvas for downscaling
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = EXPORT_SIZE;
      smallCanvas.height = EXPORT_SIZE;
      const smallCtx = smallCanvas.getContext('2d');
      if (!smallCtx) return { blob: null, isEmpty: true };

      // 2. Fill white first (to prevent transparent background)
      smallCtx.fillStyle = '#ffffff';
      smallCtx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

      // 3. Draw source to small canvas
      // Use standard smoothing for resizing
      smallCtx.imageSmoothingEnabled = true;
      smallCtx.imageSmoothingQuality = 'high';
      smallCtx.drawImage(sourceCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

      // 4. Check for emptiness (all white)
      const imageData = smallCtx.getImageData(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      const data = imageData.data;
      let isBlank = true;

      // Loop through pixels (RGBA). If any pixel is significantly dark, it's not blank.
      // We filled with white (255,255,255). Drawing is black (0,0,0).
      // Check if we have any non-white pixels.
      // Using a threshold to account for anti-aliasing.
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // If any channel is less than 240, we assume there's some stroke
        if (r < 240 || g < 240 || b < 240) {
          isBlank = false;
          break;
        }
      }

      if (isBlank) {
        return { blob: null, isEmpty: true };
      }

      // 5. Convert to Blob
      return new Promise((resolve) => {
        smallCanvas.toBlob((blob) => {
          resolve({ blob, isEmpty: false });
        }, 'image/png');
      });
    }
  }));

  // Drawing Handlers
  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // e.preventDefault(); // Prevent scrolling on touch
    setIsDrawing(true);
    setHasContent(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    // e.preventDefault(); // Prevent scrolling on touch
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
  };

  return (
    <div className="flex flex-col items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
      <h3 className="font-semibold text-gray-700 mb-2">Digit {digit}</h3>
      <div className="relative border-2 border-gray-300 rounded overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
          onTouchMove={(e) => { e.preventDefault(); draw(e); }}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
      </div>
      <button
        onClick={initCanvas}
        className="mt-2 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition-colors"
      >
        Erase / Clear
      </button>
    </div>
  );
});

DigitCanvas.displayName = 'DigitCanvas';
export default DigitCanvas;