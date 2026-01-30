"use client";

import { useEffect, useState } from "react";

interface TypewriterProps {
    text: string;
    speed?: number;
    onComplete?: () => void;
}

export function Typewriter({ text, speed = 10, onComplete }: TypewriterProps) {
    const [displayedText, setDisplayedText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset if text changes significantly (new message), but handle streaming updates
    useEffect(() => {
        if (text.startsWith(displayedText)) {
            // It's an append update, do nothing, let the interval catch up
        } else {
            // It's a completely new text or correction
            setDisplayedText("");
            setCurrentIndex(0);
        }
    }, [text]);

    useEffect(() => {
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
    }, [currentIndex, text, speed, onComplete]);

    return <span>{displayedText || text}</span>;
}
