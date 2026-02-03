/**
 * FileSystem Storage Provider
 * 
 * Implements StorageProvider using the local filesystem.
 * Used for development and testing. In production, replace with R2Storage.
 */

import { StorageProvider } from './storage-provider';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileSystemStorage implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  /**
   * Creates a new FileSystemStorage instance
   * 
   * @param basePath - The base directory for file storage (default: ./uploads/audio)
   * @param baseUrl - The base URL for serving files (default: /api/audio/files)
   */
  constructor(basePath?: string, baseUrl?: string) {
    // Default to uploads/audio in the project root
    this.basePath = basePath ?? path.join(process.cwd(), 'uploads', 'audio');
    this.baseUrl = baseUrl ?? '/api/audio/files';
  }

  /**
   * Ensures the directory exists, creating it if necessary
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async upload(storagePath: string, data: Buffer, mimeType: string): Promise<string> {
    const fullPath = path.join(this.basePath, storagePath);
    const dir = path.dirname(fullPath);

    // Ensure the directory exists
    await this.ensureDir(dir);

    // Write the file
    await fs.writeFile(fullPath, data);

    // Return the URL to access the file
    return this.getUrl(storagePath);
  }

  getUrl(storagePath: string): string {
    // Return a URL that can be used to fetch the file via an API route
    return `${this.baseUrl}/${storagePath}`;
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, storagePath);
    
    try {
      await fs.unlink(fullPath);
      
      // Try to remove parent directory if empty
      const dir = path.dirname(fullPath);
      try {
        const files = await fs.readdir(dir);
        if (files.length === 0) {
          await fs.rmdir(dir);
        }
      } catch {
        // Ignore errors when trying to clean up directories
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, that's fine
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, storagePath);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async download(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, storagePath);
    return fs.readFile(fullPath);
  }

  /**
   * Gets the full filesystem path for a storage path
   * Useful for debugging or direct file access
   */
  getFullPath(storagePath: string): string {
    return path.join(this.basePath, storagePath);
  }
}

// Export a singleton instance for easy use across the app
let defaultStorage: FileSystemStorage | null = null;

export function getDefaultStorage(): FileSystemStorage {
  if (!defaultStorage) {
    defaultStorage = new FileSystemStorage();
  }
  return defaultStorage;
}
