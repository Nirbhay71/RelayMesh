import React, { useEffect, useRef, useState } from 'react';
import './SplashReveal.css';

const VIDEO_SRC = '/videos/relaymesh-signature-reveal.mp4';
const POSTER_SRC = '/videos/relaymesh-signature-poster.jpg';

const SplashReveal = ({ isLoading, isAuthenticated }) => {
    const videoRef = useRef(null);
    const titleRef = useRef(null);
    const hasPlayedRef = useRef(false);

    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isUnmounted, setIsUnmounted] = useState(false);
    const [readyToExit, setReadyToExit] = useState(false);
    const [showTitle, setShowTitle] = useState(false);

    const prefersReducedMotion =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The reveal is an unauthorised-visitor moment only: skip it entirely for
    // an already-authenticated session, and replay it in full on every load
    // (no "seen it this session" shortcut) while the visitor is signed out.
    useEffect(() => {
        if (isLoading) return; // still resolving auth — stay on the dark hold

        if (isAuthenticated) {
            setReadyToExit(true);
            return;
        }

        if (hasPlayedRef.current) return;
        hasPlayedRef.current = true;

        if (prefersReducedMotion) {
            // No motion: show the settled mark plainly, hold briefly, exit.
            setShowTitle(true);
            const timer = setTimeout(() => setReadyToExit(true), 900);
            return () => clearTimeout(timer);
        }

        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            // Reveal the title once the signature has visibly settled, in
            // the last stretch of the clip, rather than waiting for the very
            // last frame.
            if (video.duration && video.currentTime >= video.duration - 2.2) {
                setShowTitle(true);
            }
        };
        const handleEnded = () => {
            // Hold the completed mark briefly before handing off.
            setTimeout(() => setReadyToExit(true), 800);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);
        video.play().catch(() => {
            // Autoplay blocked for some reason — don't strand the visitor on
            // a frozen splash screen.
            setShowTitle(true);
            setReadyToExit(true);
        });

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, isAuthenticated]);

    useEffect(() => {
        if (!isLoading && readyToExit) {
            setIsFadingOut(true);
            const timer = setTimeout(() => setIsUnmounted(true), 900);
            return () => clearTimeout(timer);
        }
    }, [isLoading, readyToExit]);

    if (isUnmounted) return null;

    return (
        <div className={`splash-container ${isFadingOut ? 'fade-out' : ''}`}>
            <div className="splash-content">
                {prefersReducedMotion || isAuthenticated ? (
                    <img className="splash-media" src={POSTER_SRC} alt="" aria-hidden="true" />
                ) : (
                    <video
                        ref={videoRef}
                        className="splash-media"
                        src={VIDEO_SRC}
                        poster={POSTER_SRC}
                        muted
                        playsInline
                        autoPlay
                        preload="auto"
                        disablePictureInPicture
                        aria-hidden="true"
                    />
                )}

                <p ref={titleRef} className={`splash-title ${showTitle ? 'is-visible' : ''}`}>
                    RelayMesh
                </p>
            </div>
        </div>
    );
};

export default SplashReveal;
