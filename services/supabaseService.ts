import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_BUCKET } from '../constants';

// Initialize Supabase client
// Note: In a real app, you might want to handle the case where keys are missing more gracefully
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Uploads a digit image blob to Supabase storage.
 * 
 * @param digit The digit number (0-9)
 * @param blob The image blob (PNG)
 * @returns Promise resolving to the result of the upload
 */
export const uploadDigit = async (digit: number, blob: Blob): Promise<{ success: boolean; error?: string }> => {
  const timestamp = Date.now();
  // Construct path: digit/timestamp.png (e.g., "7/1733570890123.png")
  const path = `${digit}/${timestamp}.png`;

  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(path, blob, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      console.error(`Error uploading digit ${digit}:`, error);
      // Robustly extract error message
      const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || "Unknown Supabase error";
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`Unexpected error uploading digit ${digit}:`, err);
    // Robustly extract catch error message
    const errorMessage = err.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

export const checkConfig = () => {
  return (
    (SUPABASE_URL as string) !== "https://YOUR-PROJECT-ID.supabase.co" &&
    (SUPABASE_ANON_KEY as string) !== "YOUR-ANON-PUBLIC-KEY"
  );
};