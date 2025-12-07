import React, { useRef, useState, useMemo } from 'react';
import DigitCanvas from './components/DigitCanvas';
import { DigitCanvasHandle, UploadResult } from './types';
import { checkConfig, uploadDigit } from './services/supabaseService';
import { FileUp, CheckCircle, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function App() {
  // Create an array of refs for the 10 canvases
  const canvasRefs = useRef<(DigitCanvasHandle | null)[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isConfigValid = useMemo(() => checkConfig(), []);

  const handleSubmit = async () => {
    if (!isConfigValid) {
      setGlobalError("Please configure Supabase keys in constants.ts first.");
      return;
    }

    setIsUploading(true);
    setResults(null);
    setGlobalError(null);

    const uploadPromises = DIGITS.map(async (digit) => {
      const canvasHandle = canvasRefs.current[digit];
      if (!canvasHandle) {
        return { digit, success: false, message: 'Canvas not initialized' };
      }

      const { blob, isEmpty } = await canvasHandle.getData();

      if (isEmpty || !blob) {
        return { digit, success: true, skipped: true };
      }

      const result = await uploadDigit(digit, blob);
      return { digit, ...result };
    });

    try {
      const uploadResults = await Promise.all(uploadPromises);
      setResults(uploadResults);

      // Optional: Clear all canvases if all (non-skipped) uploads succeeded
      const hasFailures = uploadResults.some(r => !r.success && !r.skipped);
      if (!hasFailures) {
         // Optionally clear canvases automatically on full success
         // canvasRefs.current.forEach(ref => ref?.clear());
      }
    } catch (err) {
      setGlobalError("An unexpected error occurred during the batch upload.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearAll = () => {
    canvasRefs.current.forEach(ref => ref?.clear());
    setResults(null);
    setGlobalError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 md:px-8">
      <header className="mb-8 text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Digit Collector</h1>
        <p className="text-gray-600">
          Draw digits 0-9 in the boxes below. When finished, click <strong>Submit All</strong> to process, downscale (to 28x28px), and upload to the database.
        </p>
        
        {!isConfigValid && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            <span>Warning: <code>constants.ts</code> contains placeholder Supabase keys. Uploads will fail until configured.</span>
          </div>
        )}
      </header>

      {/* Grid of Canvases */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12 w-full max-w-7xl">
        {DIGITS.map((digit) => (
          <DigitCanvas
            key={digit}
            digit={digit}
            ref={(el) => (canvasRefs.current[digit] = el)}
          />
        ))}
      </div>

      {/* Footer / Status Area */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Status Messages */}
          <div className="flex-1 text-sm">
            {isUploading && (
              <div className="text-blue-600 flex items-center gap-2 font-medium">
                <RefreshCw className="animate-spin h-4 w-4" />
                Uploading digits...
              </div>
            )}
            
            {!isUploading && results && (
              <div className="space-y-1">
                {results.some(r => r.success && !r.skipped) && (
                  <div className="text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Uploaded: {results.filter(r => r.success && !r.skipped).map(r => r.digit).join(', ')}</span>
                  </div>
                )}
                {results.some(r => !r.success) && (
                  <div className="text-red-600 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    <span>Errors: {results.filter(r => !r.success).map(r => `Digit ${r.digit} (${r.message})`).join('; ')}</span>
                  </div>
                )}
                {results.every(r => r.skipped) && (
                    <div className="text-gray-500 italic">No drawings detected. Nothing uploaded.</div>
                )}
              </div>
            )}
            
            {globalError && (
              <div className="text-red-600 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                {globalError}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
             <button
              onClick={handleClearAll}
              disabled={isUploading}
              className="px-6 py-3 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleSubmit}
              disabled={isUploading}
              className="px-8 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2 transition-all transform active:scale-95"
            >
              <FileUp className="h-5 w-5" />
              Submit All
            </button>
          </div>
        </div>
      </footer>
      
      {/* Spacer to prevent content being hidden behind fixed footer */}
      <div className="h-24"></div>
    </div>
  );
}

export default App;