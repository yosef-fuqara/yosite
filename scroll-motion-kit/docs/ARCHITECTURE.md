# Yo-Site Scroll Architecture

## Overview

The scroll "feel" comes from **layered techniques**, not one scroll library:

```
┌─────────────────────────────────────────────┐
│  Layer 1: Native vertical scroll            │
│  Layer 2: Fixed cinematic background        │
│  Layer 3: Viewport-triggered reveals        │
│  Layer 4: One scroll-linked parallax block  │
│  Layer 5: CSS marquees + pointer parallax     │
└─────────────────────────────────────────────┘
```

## Page map

| Section | DOM id | Motion type |
|---------|--------|-------------|
| EntranceSplash | — | Load overlay (time-based) |
| BackgroundEffects | — | Fixed behind all scroll |
| Hero | — | Mount stagger; smooth scroll to `#services` |
| Services | `#services` | TextReveal + card whileInView + BuildTicker |
| Process | `#works` | Step cards whileInView + Lottie lazy load |
| CTA | `#cta` | Scroll-linked Y parallax on desktop mockups |
| Footer | — | Smooth scroll to top |

## Pattern 1: Viewport reveal (primary)

**When**: headings, paragraphs, cards entering view while scrolling down.

**How**: Framer Motion `whileInView` — fires once when element intersects viewport.

**Not scroll-scrubbed**: animation plays on trigger, not tied to scroll position frame-by-frame.

Key settings:
- `once: true` — no reverse animation on scroll up
- Negative margin (`-40px` to `-100px`) — trigger before fully visible
- Easing `[0.16, 1, 0.3, 1]` — premium deceleration curve

## Pattern 2: Scroll-linked parallax (CTA only)

**When**: decorative floating UI mockups beside a form.

**How**:
1. `useScroll({ target: sectionRef, offset: ["start end", "end start"] })`
2. Smooth with `useSpring({ stiffness: 60, damping: 25 })`
3. Map to Y transforms: left column down, right column up
4. Disable on mobile

## Pattern 3: Fixed background illusion

**When**: cinematic galaxy/nebula behind all content.

**How**: `position: fixed; inset: 0` on background component. Content scrolls over it.

Mouse parallax on nebula blobs uses `useMotionValue` + `useSpring` (pointer-driven, not scroll).

## Pattern 4: Horizontal ticker

**When**: infinite scrolling chip list (Services section).

**How**:
- CSS `@keyframes build-ticker` — `translate3d(-50%, 0, 0)` over 55s
- Pause on hover/drag
- Pointer drag + vertical wheel → horizontal `scrollLeft`
- `prefers-reduced-motion: reduce` → static wrapped layout

## Pattern 5: Lazy Lottie

**When**: heavy animation in process section.

**How**: `IntersectionObserver` with `rootMargin: "120px"`, disconnect after first intersection, dynamic import of `lottie-web/build/player/lottie_light`.

## Dependencies

```json
{
  "framer-motion": "^12.40.0"
}
```

Optional for Lottie pattern:
```json
{
  "lottie-web": "via dynamic import"
}
```

## What is NOT used

- Lenis
- GSAP / ScrollTrigger
- Locomotive Scroll
- react-scroll-parallax
- Scroll snap
- Pinned/sticky scroll sections
- Scroll-scrubbed image sequences
