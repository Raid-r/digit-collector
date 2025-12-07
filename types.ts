export interface DigitCanvasHandle {
  clear: () => void;
  getData: () => Promise<{ blob: Blob | null; isEmpty: boolean }>;
}

export interface UploadStatus {
  digit: number;
  status: 'pending' | 'success' | 'error' | 'skipped';
  message?: string;
}

export type UploadResult = {
  digit: number;
  success: boolean;
  message?: string;
  skipped?: boolean;
};