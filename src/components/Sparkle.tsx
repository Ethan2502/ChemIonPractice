import React, { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface SparkleProps {
    trigger: number;
    targetRef?: RefObject<HTMLInputElement | null>;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
}

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export const Sparkle: React.FC<SparkleProps> = ({ trigger, targetRef }) => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (trigger === 0 || !targetRef?.current) return;

        const rect = targetRef.current.getBoundingClientRect();

        // Update container position to top-left of the input
        // Using viewport coordinates directly for a fixed container
        setPosition({
            top: rect.top,
            left: rect.left
        });

        // Generate 30-40 particles
        const count = Math.floor(Math.random() * 10) + 30;
        const newParticles: Particle[] = [];
        const width = rect.width;
        const height = rect.height;
        const perimeter = 2 * (width + height);

        for (let i = 0; i < count; i++) {
            // Pick a random point on the perimeter
            const p = Math.random() * perimeter;
            let startX = 0;
            let startY = 0;
            let angle = 0;

            if (p < width) {
                // Top edge
                startX = p;
                startY = 0;
                angle = -Math.PI / 2 + (Math.random() - 0.5);
            } else if (p < width + height) {
                // Right edge
                startX = width;
                startY = p - width;
                angle = 0 + (Math.random() - 0.5);
            } else if (p < 2 * width + height) {
                // Bottom edge
                startX = (2 * width + height) - p;
                startY = height;
                angle = Math.PI / 2 + (Math.random() - 0.5);
            } else {
                // Left edge
                startX = 0;
                startY = (2 * width + 2 * height) - p;
                angle = Math.PI + (Math.random() - 0.5);
            }

            const velocity = Math.random() * 2 + 3;

            newParticles.push({
                id: Date.now() + i,
                x: startX,
                y: startY,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 6 + 4,
                rotation: Math.random() * 360
            });
        }

        setParticles(newParticles);

        const timeout = setTimeout(() => setParticles([]), 1500);
        return () => clearTimeout(timeout);
    }, [trigger, targetRef]);

    if (particles.length === 0) return null;

    return createPortal(
        <>
            <style>{`
                @keyframes confetti-fall {
                    0% {
                        opacity: 1;
                        transform: translate(0, 0) rotate(0deg) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(var(--tx), var(--ty)) rotate(var(--rotation)) scale(0.3);
                    }
                }
            `}</style>
            <div style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                pointerEvents: 'none',
                zIndex: 99999
            }}>
                {particles.map(particle => (
                    <div
                        key={particle.id}
                        style={{
                            position: 'absolute',
                            left: `${particle.x}px`,
                            top: `${particle.y}px`,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            borderRadius: '50%',
                            backgroundColor: particle.color,
                            // @ts-ignore
                            '--tx': `${particle.vx * 40}px`,
                            '--ty': `${particle.vy * 40}px`,
                            '--rotation': `${particle.rotation * 2}deg`,
                            animation: 'confetti-fall 1s ease-out forwards',
                            boxShadow: `0 0 4px ${particle.color}`
                        }}
                    />
                ))}
            </div>
        </>,
        document.body
    );
};

