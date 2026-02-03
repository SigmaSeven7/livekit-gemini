/**
 * Storage Module
 * 
 * Re-exports storage providers and utilities.
 * Import from '@/lib/storage' for easy access.
 */

export { StorageProvider, getAudioStoragePath } from './storage-provider';
export { FileSystemStorage, getDefaultStorage } from './filesystem-storage';
