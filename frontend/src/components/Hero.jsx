import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MousePointer2, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
    const containerRef = useRef(null);
    const destinationRef = useRef(null);
    const leftCurtainRef = useRef(null);
    const rightCurtainRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "+=1200",
                    scrub: 1.5,
                    pin: true,
                    anticipatePin: 1
                }
            });

            tl.to(leftCurtainRef.current, {
                xPercent: -100,
                opacity: 0,
                ease: "power2.inOut"
            }, 0);

            tl.to(rightCurtainRef.current, {
                xPercent: 100,
                opacity: 0,
                ease: "power2.inOut"
            }, 0);

            tl.fromTo(destinationRef.current,
                { opacity: 0, scale: 0.9, x: 50 },
                { opacity: 1, scale: 1, x: 0, duration: 1, ease: "power2.out" },
                0.2 // Start reveal slightly after curtains begin to move
            );
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="relative h-screen w-full bg-[#f0f7ff] overflow-hidden"
        >
            {/* Background Content: Revealed after clouds part */}
            <div className="absolute inset-0 flex items-center justify-start px-10 md:px-20 z-0">
                {/* CASTLE: Positioned on the right, better sized and clearer */}
                <div
                    ref={destinationRef}
                    className="absolute right-[8%] top-[15%] w-[450px] h-[550px] pointer-events-none flex items-center justify-center opacity-0"
                >
                    <img
                        src="/assets/destination-removebg-preview copy.png"
                        alt="Floating Destination"
                        className="w-full h-full object-contain animate-float drop-shadow-2xl"
                        style={{
                            WebkitMaskImage: 'radial-gradient(circle at center, black 70%, transparent 95%)',
                            maskImage: 'radial-gradient(circle at center, black 70%, transparent 95%)'
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-2xl text-slate-800">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, delay: 0.5 }}
                    >
                        <span className="text-xs uppercase tracking-[0.5em] text-slate-500 font-semibold mb-4 block">
                            Digital Creator
                        </span>
                        <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-slate-900 mb-2">
                            NIRBHAY
                        </h1>
                        <h2 className="text-2xl md:text-3xl font-light text-slate-700 mb-8 tracking-widest">
                            Full Stack Developer
                        </h2>
                        <p className="text-lg text-slate-600 mb-10 max-w-md leading-relaxed">
                            Building digital experiences through code and creativity.
                        </p>

                        <div className="flex gap-4">
                            <button className="px-8 py-4 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group">
                                Begin Journey
                                <MousePointer2 size={18} className="transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* CURTAIN LAYERS: Using gradients + images to guarantee "Fog" visibility */}
            <div className="absolute inset-0 z-50 flex pointer-events-none">
                {/* Left Side Curtain */}
                <div
                    ref={leftCurtainRef}
                    className="relative w-[50.5vw] h-full bg-gradient-to-r from-[#f0f7ff] to-white/90 overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.05)]"
                >
                    <img src="/assets/lower-left-cloud.png" className="absolute top-[0%] left-[-20%] w-[150%] h-full object-cover opacity-100 contrast-110 blur-[1px]" alt="" />
                    <img src="/assets/normal-cloud.jpg" className="absolute top-[20%] right-[-10%] w-[100%] h-[60%] object-contain opacity-40 mix-blend-multiply" alt="" />
                </div>

                {/* Right Side Curtain */}
                <div
                    ref={rightCurtainRef}
                    className="relative w-[50.5vw] h-full bg-gradient-to-l from-[#f0f7ff] to-white/90 overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)]"
                >
                    <img src="/assets/lower-left-cloud.png" className="absolute top-[0%] right-[-20%] w-[150%] h-full object-cover opacity-100 contrast-110 blur-[1px] transform -scale-x-100" alt="" />
                    <img src="/assets/normal-cloud.jpg" className="absolute top-[20%] left-[-10%] w-[100%] h-[60%] object-contain opacity-40 mix-blend-multiply transform -scale-x-100" alt="" />
                </div>
            </div>

            {/* Fixed Navigation/Indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-[60]">
                <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold">
                    Scroll to Reveal
                </span>
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <ChevronDown size={24} className="text-slate-400" />
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
