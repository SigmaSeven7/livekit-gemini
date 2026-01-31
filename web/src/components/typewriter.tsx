"use client";

import { useEffect, useState } from "react";

interface TypewriterProps {
    text: string;
    speed?: number;
    isPaused?: boolean;
    isStopped?: boolean;
    onComplete?: () => void;
}

export function Typewriter({ text, speed = 10, isPaused = false, isStopped = false, onComplete }: TypewriterProps) {
    const [displayedText, setDisplayedText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset if text changes significantly (new message), but handle streaming updates
    useEffect(() => {
        // If stopped, never update text from props
        if (isStopped) {
            return;
        }

        if (text.startsWith(displayedText)) {
            // It's an append update, do nothing, let the interval catch up
        } else {
            // It's a completely new text or correction
            setDisplayedText("");
            setCurrentIndex(0);
        }
    }, [text, isStopped]); // Added isStopped dependency

    useEffect(() => {
        if (isPaused || isStopped) {
            return;
        }

        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex]);
                setCurrentIndex((prev) => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        } else {
            if (onComplete) {
                onComplete();
            }
        }
    }, [currentIndex, text, speed, onComplete, isPaused, isStopped]);

    return <span>{displayedText || (isStopped ? displayedText : text)}</span>;
}
