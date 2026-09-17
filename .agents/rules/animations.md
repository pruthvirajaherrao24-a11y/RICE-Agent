# Animation & Transition Directive

Whenever working on UI interactions, page transitions, scrolling effects, or complex animations in this workspace:

1. **Leverage Installed Libraries**: Prefer utilizing the installed animation libraries instead of writing complex custom CSS keyframes or manual scroll/pointer listeners:
   - **`motion`** (imported from `motion/react`): Best for reactive UI states, micro-interactions, layout transitions, exit/entry animations, gestures, and quick springs.
   - **`gsap`**: Best for complex, timeline-based sequence animations, performance-heavy path tracing, SVG manipulation, and scroll scrubbing.
   - **`@gsap/react`**: Use the `useGSAP()` hook for all React-GSAP setups to guarantee correct component mounting cleanup, scrollTrigger resets, and target scoping.
   - **`lenis`** (imported from `lenis/react`): Used for smooth scrolling and syncing scroll states with ScrollTrigger/Framer Motion.

2. **Agent Knowledge Requirement**: Any active agent working in this codebase **MUST** be prepared to go through, explain, and write implementations for each of these libraries, their components, and features whenever asked for them by the user.

---

## Quick Reference of Installed Animation Libraries

### 1. Motion for React (`motion/react`)
- **Main imports**: `motion`, `AnimatePresence`, `LayoutGroup`, `useScroll`, `useTransform`, `useSpring`.
- **Use Cases**:
  - Hover / Tap gestures (`whileHover`, `whileTap`).
  - Dropdown / Modal entrance and exit (`<AnimatePresence>`).
  - Layout transitions (`layoutId` for shared layouts).
  - Drag-to-dismiss, drawer gestures, and magnetic hover effects.

### 2. GSAP & `@gsap/react`
- **Main imports**: `gsap` (core), `ScrollTrigger` (plugin), `useGSAP` (React hook from `@gsap/react`).
- **Use Cases**:
  - Complex sequential timelines (`gsap.timeline()`).
  - Scroll-triggered reveal animations and canvas scrubs (`ScrollTrigger`).
  - High-performance, frame-precise canvas or SVG morphs.
  - Proper memory cleanup using the `useGSAP` hook context.

### 3. Lenis Smooth Scroll (`lenis/react`)
- **Main imports**: `ReactLenis` wrapper (from `lenis/react`), `useLenis` hook.
- **Use Cases**:
  - Page-wide smooth scrolling (instantiated in layout/providers).
  - Syncing GSAP ScrollTrigger scroll events perfectly with frame loops.
  - Custom scroll anchoring and velocity-based animations.
