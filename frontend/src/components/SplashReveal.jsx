import React, { useState, useEffect } from 'react';
import './SplashReveal.css';

const SplashReveal = ({ isLoading }) => {
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isUnmounted, setIsUnmounted] = useState(false);
    const [phase, setPhase] = useState(0); // 0: dark, 1: aurora wakes, 2: brand emerges, 3: peak

    useEffect(() => {
        // Timeline for the cinematic intro
        const p1 = setTimeout(() => setPhase(1), 1000);
        const p2 = setTimeout(() => setPhase(2), 2000);
        const p3 = setTimeout(() => setPhase(3), 3500);

        return () => {
            clearTimeout(p1);
            clearTimeout(p2);
            clearTimeout(p3);
        };
    }, []);

    useEffect(() => {
        if (!isLoading) {
            setIsFadingOut(true);
            const timer = setTimeout(() => {
                setIsUnmounted(true);
            }, 1200); // 1.2s crossfade
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    if (isUnmounted) return null;

    return (
        <div 
            className={`splash-container ${isFadingOut ? 'fade-out' : ''}`}
        >
            <div className={`splash-aurora-layer phase-${phase}`}>
                <div className="splash-blob splash-blob-1" />
                <div className="splash-blob splash-blob-2" />
                <div className="splash-blob splash-blob-3" />
                <div className="splash-blob splash-blob-4" />
            </div>
            
            <div className={`splash-brand-container phase-${phase}`}>
                <h1 className="splash-brand-text">
                    Relay Mesh
                </h1>
            </div>
        </div>
    );
};

export default SplashReveal;
