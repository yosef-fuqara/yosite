/**
 * Global page canvas — solid unified white.
 */
export default function BackgroundEffects() {
  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: "var(--site-background, #ffffff)" }}
      aria-hidden
    />
  );
}
