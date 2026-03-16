import { useEffect } from 'react';

export const useElasticButtons = () => {
    useEffect(() => {
        let activeButton: HTMLElement | null = null;
        let buttonCenter = { x: 0, y: 0 };

        const handlePointerDown = (e: PointerEvent) => {
            // Only respond to primary click (left mouse button or single touch)
            if (e.button !== 0 && e.pointerType === 'mouse') return;

            const target = e.target as HTMLElement;

            // Allow grabbing the entire group, or single buttons
            const elasticGroup = target.closest('.elastic-group') as HTMLElement;
            const button = target.closest('button');
            const interactiveEl = elasticGroup || button;

            if (interactiveEl) {
                activeButton = interactiveEl;
                const rect = activeButton.getBoundingClientRect();
                buttonCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };

                activeButton.classList.add('is-elastic-dragging');
                activeButton.style.setProperty('--elastic-scale', '0.96'); // Slightly subtler scale for grouped elements
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!activeButton) return;

            // Calculate distance from center of the button to the pointer
            const deltaX = e.clientX - buttonCenter.x;
            const deltaY = e.clientY - buttonCenter.y;

            // Tension determines how "stiff" the material is. Lower tension = stiffer.
            const tension = 0.25;
            const stretchX = deltaX * tension;
            const stretchY = deltaY * tension;

            // Max distance the button can stretch from its base position
            const maxStretch = 20;

            // Calculate total distance using Pythagorean theorem 
            const distance = Math.sqrt(stretchX * stretchX + stretchY * stretchY);

            // Constrain stretch to a perfect circle via ratio
            let finalX = stretchX;
            let finalY = stretchY;
            if (distance > maxStretch) {
                const ratio = maxStretch / distance;
                finalX *= ratio;
                finalY *= ratio;
            }

            // Apply the X and Y movement via CSS variables
            activeButton.style.setProperty('--elastic-x', `${finalX}px`);
            activeButton.style.setProperty('--elastic-y', `${finalY}px`);
        };

        const resetActiveButton = () => {
            if (activeButton) {
                // Return everything to initial state to trigger the bounce transition
                activeButton.classList.remove('is-elastic-dragging');
                activeButton.style.removeProperty('--elastic-x');
                activeButton.style.removeProperty('--elastic-y');
                activeButton.style.removeProperty('--elastic-scale');
                activeButton = null;
            }
        };

        const handlePointerUp = () => {
            resetActiveButton();
        };

        window.addEventListener('pointerdown', handlePointerDown, { passive: true });
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
            resetActiveButton();
        };
    }, []);
};
