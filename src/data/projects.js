/**
 * Selected work entries.
 *
 * Set `image` to a public path (e.g. "/work/project-one.webp") when the
 * real asset is ready. Leave it null/empty to keep the frame fully black.
 * `video` is an optional muted hover preview; `image` remains the poster.
 * `href` is the project destination; replace "#" when pages exist.
 */
export const PROJECTS = [
  {
    id: "one",
    image: "/work/aurelia-house.png",
    video: "/work/aurelia-house.mp4",
    href: "#",
  },
  {
    id: "two",
    image: "/work/veloura.png",
    video: "/work/veloura.mp4",
    href: "#",
  },
  {
    id: "three",
    image: "/work/nocturne-studio.png",
    video: "/work/nocturne-studio.mp4",
    videoCrop: "nocturne",
    href: "#",
  },
];

export const PROJECT_COUNT = PROJECTS.length;
