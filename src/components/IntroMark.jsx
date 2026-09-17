import { INTRO_LOGO } from "../utils/introLogoMotion";

export default function IntroMark() {
  const { viewBox, bodyPath, armPath, dot } = INTRO_LOGO;
  const [x, y, w, h] = viewBox;

  return (
    <div className="yo-intro__mark" data-intro-mark="">
      <svg
        className="yo-intro__mark-svg"
        viewBox={`${x} ${y} ${w} ${h}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <path data-intro-body="" d={bodyPath} fill="#ffffff" />
        <path data-intro-arm="" d={armPath} fill="#ffffff" />
        <g data-intro-dot="" transform={`translate(${dot.cx} ${dot.cy})`}>
          <circle cx="0" cy="0" r={dot.r} fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}
