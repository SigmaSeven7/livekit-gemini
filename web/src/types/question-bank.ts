/**
 * Question Bank Types
 * Definitions for the Interview Question Generation Service
 */

import { InterviewConfig } from "@/data/interview-options";

export interface QuestionHint {
    text: string;
    level: 1 | 2 | 3; // 1=Subtle, 2=Moderate, 3=Direct
}

export interface InterviewQuestion {
    id: string; // generated uuid
    text: string;
    category: string; // e.g., "Technical", "Behavioral", "System Design"
    hints: string[]; // Array of 3 strings (Subtle, Moderate, Direct)
}

export interface QuestionBankResponse {
    questions: {
        question: string;
        category: string;
        hints: string[];
    }[];
}

export interface GenerateQuestionsRequest {
    config: InterviewConfig;
}

export interface GenerateQuestionsResponse {
    questions: InterviewQuestion[];
}
