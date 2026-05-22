import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function BackgroundEffects() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for premium drift effect - declared at top-level
  const springX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20 });
  const springX2 = useSpring(mouseX, { stiffness: 20, damping: 15 });
  const springY2 = useSpring(mouseY, { stiffness: 20, damping: 15 });

  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize stars using lazy initializer to avoid synchronous setStates in useEffect
  const [stars] = useState(() => 
    Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 5,
    }))
  );

  // Initialize meteors with random positions and animation parameters
  const [meteors] = useState(() =>
    Array.from({ length: 7 }).map((_, i) => ({
      id: i,
      top: Math.random() * 35 - 5,    // start in the top portion (-5% to 30%)
      left: Math.random() * 50 + 40,  // start in the right portion (40% to 90%)
      delay: Math.random() * 18,       // staggered random start delays
      duration: Math.random() * 6 + 6, // infinite loop cycle length (6s to 12s)
    }))
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const handleMouseMove = (e) => {
      if (window.innerWidth >= 768) {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        mouseX.set(x * 40);
        mouseY.set(y * 40);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 bg-black">
      {/* Base nebula wash — visible across full scroll height */}
      <div
        className="absolute inset-0 galaxy-nebula-base"
        aria-hidden
      />

      {/* Cinematic noise film grain */}
      <div className="noise-overlay" />

      {/* Grid overlay — subtle, site-wide */}
      <div className="absolute inset-0 grid-overlay opacity-20" />

      {/* CSS encapsulated shooting star meteor animation */}
      <style>{`
        @keyframes meteor-slide {
          0% {
            transform: translate3d(0, 0, 0) rotate(-45deg);
            opacity: 0;
          }
          1% {
            opacity: 1;
          }
          12% {
            opacity: 0;
          }
          18%, 100% {
            transform: translate3d(-750px, 750px, 0) rotate(-45deg);
            opacity: 0;
          }
        }
        .meteor-trail {
          position: absolute;
          width: 140px;
          height: 1.5px;
          background: linear-gradient(to left, rgba(255, 255, 255, 1) 0%, rgba(139, 92, 246, 0.4) 30%, transparent 100%);
          opacity: 0;
          pointer-events: none;
          animation-name: meteor-slide;
          animation-iteration-count: infinite;
          animation-timing-function: cubic-bezier(0.1, 0.8, 0.25, 1);
        }
        .meteor-trail::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3.5px;
          height: 3.5px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 8px 2px rgba(167, 139, 250, 0.85), 0 0 3px 0.5px white;
        }
      `}</style>

      {/* Meteors (Shooting Stars) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {meteors.map((meteor) => (
          <div
            key={meteor.id}
            className="meteor-trail"
            style={{
              top: `${meteor.top}%`,
              left: `${meteor.left}%`,
              animationDuration: `${meteor.duration}s`,
              animationDelay: `${meteor.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Star Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white/50"
            style={{
              top: `${star.y}%`,
              left: `${star.x}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animation: `twinkle ${star.duration}s infinite ease-in-out ${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Gaseous Space Nebula Glows — distributed for full-page continuity */}
      {!isMobile ? (
        <>
          <motion.div
            style={{ x: springX, y: springY }}
            className="absolute top-[-12%] left-[10%] w-[72vw] h-[72vw] max-w-[920px] max-h-[920px] rounded-full bg-violet-800/12 blur-[140px] glow-animation-slow"
          />
          <motion.div
            style={{ x: springX2, y: springY2 }}
            className="absolute top-[22%] right-[-12%] w-[52vw] h-[52vw] max-w-[720px] max-h-[720px] rounded-full bg-purple-900/10 blur-[130px] glow-animation-slower"
          />
          <motion.div
            style={{ x: springX, y: springY }}
            className="absolute top-[48%] left-[-8%] w-[48vw] h-[48vw] max-w-[640px] max-h-[640px] rounded-full bg-indigo-950/14 blur-[150px] glow-animation-slow"
          />
          <motion.div
            style={{ x: springX2, y: springY2 }}
            className="absolute top-[62%] right-[5%] w-[44vw] h-[44vw] max-w-[600px] max-h-[600px] rounded-full bg-violet-950/12 blur-[130px] glow-animation-slower"
          />
          <motion.div
            style={{ x: springX, y: springY }}
            className="absolute bottom-[-8%] left-[20%] w-[58vw] h-[58vw] max-w-[780px] max-h-[780px] rounded-full bg-purple-950/10 blur-[140px] glow-animation-slow"
          />
        </>
      ) : (
        <>
          <div className="absolute top-[-8%] left-[0%] w-[95vw] h-[55vh] rounded-full bg-violet-950/14 blur-[90px]" />
          <div className="absolute top-[40%] right-[-15%] w-[85vw] h-[45vh] rounded-full bg-purple-950/10 blur-[90px]" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[90vw] h-[50vh] rounded-full bg-indigo-950/12 blur-[100px]" />
        </>
      )}

      {/* Soft edge vignette — keeps text readable without hiding the galaxy */}
      <div className="absolute inset-0 galaxy-vignette pointer-events-none" />
    </div>
  );
}
