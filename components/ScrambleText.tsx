import React, { useState, useEffect, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&[]{}+-=*^<>_';

interface ScrambleTextProps {
  text: string;
  className?: string;
  trigger?: boolean;
}

const ScrambleText: React.FC<ScrambleTextProps> = ({ text, className, trigger }) => {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) {
        setDisplayText(text);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
    }

    let iteration = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Calculate step speed based on text length to ensure animation finishes in reasonable time (~1.5s max)
    // 30ms interval. Target 50 frames.
    const step = Math.max(1/2, text.length / 40);

    intervalRef.current = window.setInterval(() => {
      setDisplayText(prev => 
        text
          .split("")
          .map((char, index) => {
            if (index < iteration) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text); // Ensure final state is clean
      }

      iteration += step; 
    }, 30);

    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trigger, text]);
  
  return <span className={className}>{displayText}</span>;
};

export default ScrambleText;