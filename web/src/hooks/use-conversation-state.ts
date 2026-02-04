/**
 * useConversationState Hook
 * 
 * Manages the conversation JSON structure throughout an interview session.
 * Handles creating messages, finalizing audio, and preparing for upload.
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ConversationMessage, BatchUploadRequest, BatchUploadResponse } from '@/types/conversation';

export interface UseConversationStateOptions {
  /** The interview ID from the database (required) */
  interviewId: string;
}

export interface UseConversationStateReturn {
  /** All messages in the conversation */
  messages: ConversationMessage[];
  /** The interview ID */
  interviewId: string;
  
  /**
   * Adds a new message to the conversation
   * Call this when a transcription segment is received
   */
  addMessage(params: {
    participant: 'user' | 'agent';
    transcript: string;
    timestampStart: number;
    timestampEnd: number;
  }): string; // Returns the transcriptId
  
  /**
   * Updates an existing message (e.g., when transcript text changes)
   */
  updateMessage(transcriptId: string, updates: Partial<Omit<ConversationMessage, 'transcriptId' | 'interviewId'>>): void;
  
  /**
   * Finalizes a message by adding its audio data
   * Call this when the segment is complete and audio has been extracted
   */
  finalizeMessageAudio(transcriptId: string, audioBase64: string): void;
  
  /**
   * Updates messages with their audio URLs after upload
   * Returns the updated messages array (for immediate use before state updates)
   */
  updateAudioUrls(mappings: Record<string, string>): ConversationMessage[];
  
  /**
   * Gets all messages that have audioBase64 but no audioUrl (ready for upload)
   */
  getMessagesForUpload(): ConversationMessage[];
  
  /**
   * Uploads all pending audio to the server and updates URLs
   * Returns success status and the updated messages array
   */
  uploadPendingAudio(): Promise<{ success: boolean; messages: ConversationMessage[] }>;
  
  /**
   * Saves the conversation to the database
   * @param status - Interview status
   * @param messagesToSave - Optional messages array to save (use when you have updated messages before state sync)
   */
  saveToDatabase(status?: 'in_progress' | 'completed' | 'paused', messagesToSave?: ConversationMessage[]): Promise<boolean>;
  
  /**
   * Exports the conversation as JSON string
   */
  toJSON(): string;
  
  /**
   * Loads messages from a JSON string (for resuming)
   */
  loadFromJSON(json: string): void;
  
  /**
   * Clears all messages (for starting fresh)
   */
  clear(): void;

  /**
   * Gets a message by its transcript ID
   */
  getMessage(transcriptId: string): ConversationMessage | undefined;

  /**
   * Appends a finalized message to the database with deduplication.
   * Uses content hash to prevent duplicate storage.
   * @param message - The complete message to persist
   * @returns Promise resolving to true if successful (including duplicates)
   */
  appendMessageToDatabase(message: ConversationMessage): Promise<boolean>;

  /**
   * Uploads a single audio file and returns the URL.
   * Also updates the message in state with the audioUrl.
   * @param transcriptId - The transcript ID for the message
   * @param audioBase64 - The base64-encoded audio data
   * @returns Promise resolving to the audio URL or null if failed
   */
  uploadSingleAudio(transcriptId: string, audioBase64: string): Promise<string | null>;
}

export function useConversationState(options: UseConversationStateOptions): UseConversationStateReturn {
  const [interviewId] = useState(() => options.interviewId);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  
  // Use ref to track message IDs for deduplication
  const messageIdsRef = useRef<Set<string>>(new Set());

  const addMessage = useCallback((params: {
    participant: 'user' | 'agent';
    transcript: string;
    timestampStart: number;
    timestampEnd: number;
  }): string => {
    const transcriptId = uuidv4();
    
    const newMessage: ConversationMessage = {
      transcriptId,
      interviewId,
      participant: params.participant,
      transcript: params.transcript,
      timestampStart: params.timestampStart,
      timestampEnd: params.timestampEnd,
      audioBase64: null,
      audioUrl: null,
    };
    
    messageIdsRef.current.add(transcriptId);
    setMessages(prev => [...prev, newMessage]);
    
    return transcriptId;
  }, [interviewId]);

  const updateMessage = useCallback((
    transcriptId: string,
    updates: Partial<Omit<ConversationMessage, 'transcriptId' | 'interviewId'>>
  ) => {
    setMessages(prev => prev.map(msg => 
      msg.transcriptId === transcriptId
        ? { ...msg, ...updates }
        : msg
    ));
  }, []);

  const finalizeMessageAudio = useCallback((transcriptId: string, audioBase64: string) => {
    setMessages(prev => prev.map(msg =>
      msg.transcriptId === transcriptId
        ? { ...msg, audioBase64 }
        : msg
    ));
  }, []);

  const updateAudioUrls = useCallback((mappings: Record<string, string>): ConversationMessage[] => {
    let updatedMessages: ConversationMessage[] = [];
    setMessages(prev => {
      updatedMessages = prev.map(msg => {
        const audioUrl = mappings[msg.transcriptId];
        if (audioUrl) {
          return {
            ...msg,
            audioUrl,
            audioBase64: null, // Clear base64 after URL is set
          };
        }
        return msg;
      });
      return updatedMessages;
    });
    return updatedMessages;
  }, []);

  const getMessagesForUpload = useCallback((): ConversationMessage[] => {
    return messages.filter(msg => msg.audioBase64 && !msg.audioUrl);
  }, [messages]);

  const uploadPendingAudio = useCallback(async (): Promise<{ success: boolean; messages: ConversationMessage[] }> => {
    const pendingMessages = getMessagesForUpload();
    
    if (pendingMessages.length === 0) {
      return { success: true, messages }; // Nothing to upload, return current messages
    }

    try {
      const request: BatchUploadRequest = {
        interviewId,
        segments: pendingMessages.map(msg => ({
          transcriptId: msg.transcriptId,
          audioBase64: msg.audioBase64!,
        })),
      };

      const response = await fetch('/api/audio/batch-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.error('Failed to upload audio:', await response.text());
        return { success: false, messages };
      }

      const data: BatchUploadResponse = await response.json();
      const updatedMessages = updateAudioUrls(data.urls);
      
      return { success: true, messages: updatedMessages };
    } catch (error) {
      console.error('Error uploading audio:', error);
      return { success: false, messages };
    }
  }, [interviewId, messages, getMessagesForUpload, updateAudioUrls]);

  const saveToDatabase = useCallback(async (
    status: 'in_progress' | 'completed' | 'paused' = 'completed',
    messagesToSave?: ConversationMessage[]
  ): Promise<boolean> => {
    // Use provided messages or fall back to current state
    const finalMessages = messagesToSave ?? messages;
    
    try {
      // First, try to update existing interview
      const updateResponse = await fetch(`/api/interviews/${interviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          messages: finalMessages,
        }),
      });

      if (updateResponse.ok) {
        return true;
      }

      // If not found (404), create new interview
      if (updateResponse.status === 404) {
        const createResponse = await fetch('/api/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
          }),
        });

        if (!createResponse.ok) {
          console.error('Failed to create interview:', await createResponse.text());
          return false;
        }

        // Update with messages
        const interview = await createResponse.json();
        const finalResponse = await fetch(`/api/interviews/${interview.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            messages: finalMessages,
          }),
        });

        return finalResponse.ok;
      }

      console.error('Failed to save interview:', await updateResponse.text());
      return false;
    } catch (error) {
      console.error('Error saving to database:', error);
      return false;
    }
  }, [interviewId, messages]);

  const toJSON = useCallback((): string => {
    return JSON.stringify(messages, null, 2);
  }, [messages]);

  const loadFromJSON = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as ConversationMessage[];
      setMessages(parsed);
      messageIdsRef.current = new Set(parsed.map(m => m.transcriptId));
    } catch (error) {
      console.error('Failed to parse conversation JSON:', error);
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    messageIdsRef.current.clear();
  }, []);

  const getMessage = useCallback((transcriptId: string): ConversationMessage | undefined => {
    return messages.find(msg => msg.transcriptId === transcriptId);
  }, [messages]);

  const appendMessageToDatabase = useCallback(async (message: ConversationMessage): Promise<boolean> => {
    try {
      const response = await fetch(`/api/interviews/${interviewId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        console.error('Failed to append message:', await response.text());
        return false;
      }

      const result = await response.json();
      if (result.duplicate) {
        console.log('Message already exists in DB, skipping duplicate');
      }
      return true;
    } catch (error) {
      console.error('Error appending message to database:', error);
      return false;
    }
  }, [interviewId]);

  const uploadSingleAudio = useCallback(async (transcriptId: string, audioBase64: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          transcriptId,
          audioBase64,
        }),
      });

      if (!response.ok) {
        console.error('Failed to upload audio:', await response.text());
        return null;
      }

      const result = await response.json();
      if (result.success && result.url) {
        // Update the message in state with the audioUrl and clear audioBase64
        setMessages(prev => prev.map(msg =>
          msg.transcriptId === transcriptId
            ? { ...msg, audioUrl: result.url, audioBase64: null }
            : msg
        ));
        return result.url;
      }
      return null;
    } catch (error) {
      console.error('Error uploading single audio:', error);
      return null;
    }
  }, [interviewId]);

  return {
    messages,
    interviewId,
    addMessage,
    updateMessage,
    finalizeMessageAudio,
    updateAudioUrls,
    getMessagesForUpload,
    uploadPendingAudio,
    saveToDatabase,
    toJSON,
    loadFromJSON,
    clear,
    getMessage,
    appendMessageToDatabase,
    uploadSingleAudio,
  };
}
