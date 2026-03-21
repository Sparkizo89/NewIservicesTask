import React, { useRef, useEffect, useState } from 'react';

interface MarqueeTextProps {
    text: string;
    className?: string;
    speed?: number; // px per second, default 40
    pauseOnHover?: boolean;
}

/**
 * Affiche du texte qui défile de droite à gauche uniquement si le texte dépasse
 * la largeur du conteneur. Sinon, s'affiche normalement, sans animation.
 */
const MarqueeText: React.FC<MarqueeTextProps> = ({
    text,
    className = '',
    speed = 38,
    pauseOnHover = true,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [duration, setDuration] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        const textEl = textRef.current;
        if (!container || !textEl) return;

        const check = () => {
            const containerWidth = container.clientWidth;
            const textWidth = textEl.scrollWidth;
            const overflows = textWidth > containerWidth;
            setShouldScroll(overflows);
            if (overflows) {
                // Total distance = text width + gap before repeat
                const gap = 48; // px gap between repetitions
                const totalDistance = textWidth + gap;
                setDuration(totalDistance / speed);
            }
        };

        check();
        const ro = new ResizeObserver(check);
        ro.observe(container);
        return () => ro.disconnect();
    }, [text, speed]);

    if (!shouldScroll) {
        return (
            <div ref={containerRef} className={`overflow-hidden ${className}`}>
                <span ref={textRef} className="whitespace-nowrap block">
                    {text}
                </span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`overflow-hidden relative ${className}`}
            onMouseEnter={() => pauseOnHover && setPaused(true)}
            onMouseLeave={() => pauseOnHover && setPaused(false)}
        >
            {/* Fade gradients on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-4 z-10 pointer-events-none bg-gradient-to-r from-inherit to-transparent" style={{ background: 'inherit' }} />
            <div className="absolute right-0 top-0 bottom-0 w-4 z-10 pointer-events-none" style={{ background: 'inherit' }} />

            <div
                className="flex whitespace-nowrap"
                style={{
                    animation: `marquee-scroll ${duration}s linear infinite`,
                    animationPlayState: paused ? 'paused' : 'running',
                    willChange: 'transform',
                }}
            >
                <span ref={textRef} className="pr-12 shrink-0">{text}</span>
                <span className="pr-12 shrink-0" aria-hidden="true">{text}</span>
            </div>
        </div>
    );
};

export default MarqueeText;
