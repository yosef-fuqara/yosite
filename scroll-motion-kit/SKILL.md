---
name: yo-site-scroll-motion
description: >-
  Implements yo-site scroll and motion patterns with native scroll and Framer Motion.
  Use when adding sections, scroll animations, viewport reveals, parallax, ticker marquees,
  or fixed cinematic backgrounds. Do NOT use Lenis, GSAP, or ScrollTrigger unless explicitly requested.
---

# Yo-Site Scroll Motion

## Stack

- **Scroll**: native browser scroll (no Lenis, no GSAP, no scroll-jacking)
- **Animation**: Framer Motion (`framer-motion`)
- **Layout**: fixed background layer + scrolling content in `<main className="relative z-10">`
- **Root**: `overflow-x-hidden` on app wrapper

## Decision tree

```
Adding motion to a new section?
├── Text/heading entrance     → TextReveal (patterns/TextReveal.jsx)
├── Grid/list of cards        → whileInView + cardVariants (patterns/card-reveal-variants.js)
├── Floating elements on scroll → useScrollParallax (patterns/useScrollParallax.js), desktop only
├── Horizontal marquee        → build-ticker.css + drag/wheel pattern
├── Heavy animation (Lottie)  → LazyLottie with IntersectionObserver (patterns/LazyLottie.jsx)
└── Page background           → fixed layer (patterns/AppLayout.jsx)
```

## Default: viewport reveal (use 90% of the time)

```jsx
import TextReveal from "./TextReveal";

<TextReveal delay={0.15}>
  <h2>Section title</h2>
</TextReveal>
```

TextReveal settings:
- `initial`: `{ opacity: 0, x: 40, scale: 0.97 }`
- `whileInView`: `{ opacity: 1, x: 0, scale: 1 }`
- `viewport`: `{ once: true, margin: "-100px" }`
- `transition`: `{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }`

## Staggered cards

```jsx
import { motion } from "framer-motion";
import { benefitCardVariants } from "./card-reveal-variants";

{items.map((item, index) => (
  <motion.div
    key={item.id}
    custom={index}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-50px" }}
    variants={benefitCardVariants}
  >
    {item.content}
  </motion.div>
))}
```

Use `-40px` to `-100px` viewport margins to trigger slightly before fully visible.

## Scroll-linked parallax (exception — desktop only)

Only for decorative floating panels beside content (CTA-style). Never use for every section.

```jsx
import useScrollParallax from "./useScrollParallax";

const { sectionRef, leftY, rightY, isMobile } = useScrollParallax();

<section ref={sectionRef}>
  <motion.div style={{ y: isMobile ? 0 : leftY }}>...</motion.div>
  <motion.div style={{ y: isMobile ? 0 : rightY }}>...</motion.div>
</section>
```

Hook config:
- `useScroll({ target, offset: ["start end", "end start"] })`
- `useSpring(scrollYProgress, { stiffness: 60, damping: 25 })`
- `leftY`: `[-60, 90]`, `rightY`: `[90, -60]`
- Disable on `window.innerWidth < 1024`

## App layout pattern

```jsx
<div className="relative min-h-screen bg-black overflow-x-hidden">
  <BackgroundEffects /> {/* fixed inset-0 */}
  <Navbar />
  <main className="relative z-10">
    {/* sections scroll here */}
  </main>
  <Footer />
</div>
```

Section anchors: `#services`, `#works`, `#cta`

## Navigation scroll

```js
document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
window.scrollTo({ top: 0, behavior: "smooth" });
```

## Conventions

| Setting | Value |
|---------|-------|
| Easing | `[0.16, 1, 0.3, 1]` |
| Reveals | `viewport={{ once: true }}` always |
| Card stagger delay | `i * 0.1` to `i * 0.12` |
| Card duration | `0.65` – `0.8` |
| TextReveal duration | `0.9` |
| Mobile parallax | disabled (`y: 0`) |
| Reduced motion | respect `prefers-reduced-motion` |

## Anti-patterns

- Do NOT add Lenis, GSAP ScrollTrigger, or Locomotive Scroll
- Do NOT use `useScroll` for standard section reveals — use `whileInView`
- Do NOT omit `once: true` on viewport animations
- Do NOT enable scroll-linked parallax on mobile
- Do NOT assume `ImageSequenceSection` means scroll-scrubbed images — it's a process section with viewport cards

## Reference files in this kit

- `patterns/TextReveal.jsx`
- `patterns/card-reveal-variants.js`
- `patterns/useScrollParallax.js`
- `patterns/LazyLottie.jsx`
- `patterns/AppLayout.jsx`
- `patterns/build-ticker.css`
- `templates/NewSection.template.jsx`
- `templates/ScrollParallaxSection.template.jsx`
- `docs/ARCHITECTURE.md`
