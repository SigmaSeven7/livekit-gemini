/**
 * Storage Provider Interface
 * 
 * Abstracts file storage operations to allow easy switching between
 * local filesystem (development) and cloud storage like R2/S3 (production).
 */

export interface StorageProvider {
  /**
   * Uploads a file to storage
   * 
   * @param path - The storage path (e.g., "interviewId/transcriptId.wav")
   * @param data - The file data as a Buffer
   * @param mimeType - The MIME type of the file
   * @returns The URL or path where the file can be accessed
   */
  upload(path: string, data: Buffer, mimeType: string): Promise<string>;

  /**
   * Gets the public URL for a stored file
   * 
   * @param path - The storage path
   * @returns The URL to access the file
   */
  getUrl(path: string): string;

  /**
   * Deletes a file from storage
   * 
   * @param path - The storage path
   */
  delete(path: string): Promise<void>;

  /**
   * Checks if a file exists in storage
   * 
   * @param path - The storage path
   * @returns True if the file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Downloads a file from storage
   * 
   * @param path - The storage path
   * @returns The file data as a Buffer
   */
  download(path: string): Promise<Buffer>;
}

/**
 * Generates the storage path for an audio file
 * Structure: interviewId/transcriptId.wav
 */
export function getAudioStoragePath(interviewId: string, transcriptId: string): string {
  return `${interviewId}/${transcriptId}.wav`;
}
