import { INTRO_LOGO } from "../utils/introLogoMotion";

/**
 * Static intro character for the nav — replaces the text "y." after the
 * 3D handoff. Uses currentColor so mix-blend-mode: difference stays correct.
 */
export default function NavIntroMark() {
  const { viewBox, bodyPath, armPath, dot } = INTRO_LOGO;
  const [x, y, w, h] = viewBox;

  return (
    <svg
      className="yo-nav-intro-mark"
      viewBox={`${x} ${y} ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={bodyPath} fill="currentColor" />
      <path d={armPath} fill="currentColor" />
      <circle
        data-yo-logo-dot=""
        cx={dot.cx}
        cy={dot.cy}
        r={dot.r}
        fill="currentColor"
      />
    </svg>
  );
}
