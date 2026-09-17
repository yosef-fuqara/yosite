/**
 * Photographic stills for the page-load intro.
 * Prefers real-world jpg/webp files and skips the old abstract frame sequence.
 */

const PHOTO = /\.(jpe?g|webp)$/i;
const ABSTRACT_FRAME = /(?:^|\/)frame-\d+\./i;

const PUBLIC_STILLS = [
  "/intro/idea-01.jpg",
  "/intro/idea-02.jpg",
  "/intro/idea-03.jpg",
  "/intro/idea-04.jpg",
];

function sortByName(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function fromModules(modules) {
  return Object.entries(modules)
    .filter(([path]) => PHOTO.test(path) && !ABSTRACT_FRAME.test(path))
    .sort(([a], [b]) => sortByName(a, b))
    .map(([, url]) => url)
    .filter(Boolean);
}

export function detectIntroImages() {
  const bundled = import.meta.glob("../assets/intro/*.{jpg,jpeg,webp,png}", {
    eager: true,
    query: "?url",
    import: "default",
  });

  const detected = fromModules(bundled);
  if (detected.length) return detected;
  return PUBLIC_STILLS;
}
