"use client";

import { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    angle: number;
    speed: number;
    radius: number;
    shade: number;
    opacity: number;
    alive: boolean;
}

const MAX_PARTICLES = 110;

const ZONES: [number, number][] = [
    [200, 255], // upper-left
    [285, 340], // upper-right
    [20,  70],  // right-side
    [70,  110], // bottom-mid
];

interface HeroBackgroundProps {
    /** X position of the logo center as a 0–1 fraction of the container width */
    targetXRatio?: number;
    /** Y position of the logo center as a 0–1 fraction of the container height */
    targetYRatio?: number;
}

export default function HeroBackground({
    targetXRatio = 0.5,
    targetYRatio = 0.5,
}: HeroBackgroundProps) {
    const containerRef    = useRef<HTMLDivElement>(null);
    const canvasRef       = useRef<HTMLCanvasElement>(null);
    const particlesRef    = useRef<Particle[]>([]);
    const mouseRef        = useRef<{ x: number; y: number } | null>(null);
    const inViewRef       = useRef(true);
    // Keep a live ref so the tick loop always uses the latest ratios
    const targetRatioRef  = useRef({ x: targetXRatio, y: targetYRatio });

    // Sync prop changes into the live ref without re-running the effect
    useEffect(() => {
        targetRatioRef.current = { x: targetXRatio, y: targetYRatio };
    }, [targetXRatio, targetYRatio]);

    useEffect(() => {
        const container = containerRef.current;
        const canvas    = canvasRef.current;
        if (!container || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width  = container.clientWidth;
        let height = container.clientHeight;
        const dpr  = Math.min(window.devicePixelRatio || 1, 2);

        function resize() {
            width  = container!.clientWidth;
            height = container!.clientHeight;
            canvas!.width        = width  * dpr;
            canvas!.height       = height * dpr;
            canvas!.style.width  = width  + "px";
            canvas!.style.height = height + "px";
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener("resize", resize);

        function targetPoint() {
            const { x, y } = targetRatioRef.current;
            return { x: width * x, y: height * y };
        }

        function spawnParticle(scatter: boolean): Particle {
            const zone  = ZONES[Math.floor(Math.random() * ZONES.length)];
            const deg   = zone[0] + Math.random() * (zone[1] - zone[0]);
            const angle = (deg * Math.PI) / 180;
            const t     = targetPoint();
            const edgeRadius = Math.max(width, height) * 0.65;
            const dist = scatter
                ? edgeRadius * (0.3 + Math.random() * 0.7)
                : edgeRadius;
            return {
                x:       t.x + Math.cos(angle) * dist,
                y:       t.y + Math.sin(angle) * dist,
                angle,
                speed:   0.18 + Math.random() * 0.3,
                radius:  2.2  + Math.random() * 2.8,
                shade:   Math.random(),
                opacity: 0.18 + Math.random() * 0.52,
                alive:   true,
            };
        }

        particlesRef.current = Array.from({ length: MAX_PARTICLES }, () =>
            spawnParticle(true)
        );

        function handleMouseMove(e: MouseEvent) {
            const rect = container!.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        function handleMouseLeave() { mouseRef.current = null; }
        container.addEventListener("mousemove",  handleMouseMove);
        container.addEventListener("mouseleave", handleMouseLeave);

        let raf: number;
        function tick() {
            const t          = targetPoint();
            const collapsing = !inViewRef.current;
            const particles  = particlesRef.current;
            ctx!.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                let p = particles[i];

                if (!p.alive) {
                    if (!collapsing) particles[i] = p = spawnParticle(false);
                    else continue;
                }

                const dx   = t.x - p.x;
                const dy   = t.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const pullSpeed = collapsing ? p.speed * 6 : p.speed;
                p.x += (dx / dist) * pullSpeed;
                p.y += (dy / dist) * pullSpeed;

                if (!collapsing) {
                    p.x += Math.cos(p.angle) * 0.12;
                    p.y += Math.sin(p.angle) * 0.12;
                }

                const m = mouseRef.current;
                if (m) {
                    const mdx   = p.x - m.x;
                    const mdy   = p.y - m.y;
                    const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                    if (mdist < 100 && mdist > 0.01) {
                        const force = (1 - mdist / 100) * 1.8;
                        p.x += (mdx / mdist) * force;
                        p.y += (mdy / mdist) * force;
                    }
                }

                if (dist < 20) {
                    if (collapsing) { p.alive = false; continue; }
                    particles[i] = spawnParticle(false);
                    continue;
                }

                const gray = Math.round(155 + p.shade * 100);
                ctx!.beginPath();
                ctx!.fillStyle = `rgba(${gray},${gray},${gray},${p.opacity})`;
                ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx!.fill();
            }

            raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);

        const observer = new IntersectionObserver(
            ([entry]) => { inViewRef.current = entry.isIntersecting; },
            { threshold: 0.15 }
        );
        observer.observe(container);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            container.removeEventListener("mousemove",  handleMouseMove);
            container.removeEventListener("mouseleave", handleMouseLeave);
            observer.disconnect();
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 bg-black">
            <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
    );
}