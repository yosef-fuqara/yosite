/**
 * Yo-site app shell — fixed background + scrolling content.
 * Copy structure into your App.jsx.
 */
export default function AppLayout({ background, navbar, children, footer }) {
  return (
    <div className="relative min-h-screen bg-black text-gray-300 overflow-x-hidden">
      {background}
      {navbar}
      <main className="relative z-10">{children}</main>
      {footer}
    </div>
  );
}

/**
 * Fixed cinematic background wrapper.
 * Place galaxy/nebula/stars inside — content scrolls over this layer.
 */
export function FixedBackground({ children }) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {children}
    </div>
  );
}

/**
 * Standard section wrapper with anchor id.
 */
export function ScrollSection({ id, className = "", children }) {
  return (
    <section
      id={id}
      className={`relative py-24 md:py-32 px-6 md:px-12 z-10 overflow-hidden ${className}`}
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  );
}

/** Smooth scroll helpers */
export function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
