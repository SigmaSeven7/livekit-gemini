/**
 * Storage Module
 * 
 * Re-exports storage providers and utilities.
 * Import from '@/lib/storage' for easy access.
 */

export { type StorageProvider, getAudioStoragePath } from './storage-provider';
export { FileSystemStorage, getDefaultStorage } from './filesystem-storage';

export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
