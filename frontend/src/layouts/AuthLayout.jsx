import React from 'react';
import { motion } from 'framer-motion';

const AuthLayout = ({ children, title, subtitle, tagline }) => {
    return (
        <div className="min-h-screen w-full flex bg-[#0c0c0c] overflow-hidden">

            {/* ── LEFT PANEL — Cinematic Image Card ─────────────── */}
            <div className="hidden lg:flex w-[46%] min-w-[420px] p-6 flex-shrink-0">
                <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl">
                    {/* Hero Image */}
                    <img
                        src="/assets/auth-hero.png"
                        alt="RelayMesh Visual"
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Gradient overlay — bottom fade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

                    {/* Brand Badge — top left */}
                    <div className="absolute top-5 left-5">
                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/15 rounded-full px-3.5 py-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            <span className="text-white text-xs font-semibold tracking-wide">RelayMesh</span>
                        </div>
                    </div>

                    {/* Bottom caption */}
                    <div className="absolute bottom-6 left-6 right-6">
                        <p className="text-white/40 text-[10px] tracking-widest uppercase font-medium">
                            Secure · Real-time · Encrypted
                        </p>
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL — Auth Form ───────────────────────── */}
            <div className="flex-1 flex items-center justify-center px-8 py-12 relative overflow-hidden">

                {/* Subtle ambient glow */}
                <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[40%] h-[40%] bg-violet-600/8 rounded-full blur-[140px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[400px] relative z-10"
                >
                    {/* Heading */}
                    <div className="mb-9">
                        <h1 className="text-[2.15rem] font-bold text-white leading-tight tracking-tight">
                            {tagline || title}
                        </h1>
                        {subtitle && (
                            <p className="text-gray-500 text-sm mt-2 font-light leading-relaxed">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Form content */}
                    {children}
                </motion.div>
            </div>
        </div>
    );
};

export default AuthLayout;
