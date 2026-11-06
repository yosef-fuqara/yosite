const MEDIA_SRC = "/hero/hero-architecture.jpg";

/**
 * Right-hand architectural plate plus the diagonal folded sheet that covers it.
 *
 * The two are separate layers so the fold can slide independently and uncover
 * more of the picture without the picture itself moving. The sheet is painted in
 * the page colour, so only its hairline edge and curled tip read as an object.
 *
 * `.yo-hero__fold-marker` deliberately sits *outside* the transformed group: it
 * marks the fold's final tip, which is where the travelling dot has to land.
 */
export default function HeroFoldStage({ alt }) {
  return (
    <>
      <div className="yo-hero__media">
        <div className="yo-hero__media-inner">
          <img
            src={MEDIA_SRC}
            alt={alt}
            width={1024}
            height={682}
            sizes="(max-width: 767px) 62vw, 26vw"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>

      <div className="yo-hero__fold" aria-hidden="true">
        <div className="yo-hero__fold-group">
          <span className="yo-hero__fold-hair" />
          <span className="yo-hero__fold-sheet" />
          {/*
            The tip lifts and casts; the inner face carries the static tilt that
            aligns it to the diagonal, so GSAP owns the outer transform alone.
          */}
          <span className="yo-hero__fold-curl-shadow">
            <span className="yo-hero__fold-curl-shadow-face" />
          </span>
          <span className="yo-hero__fold-curl">
            <span className="yo-hero__fold-curl-face" />
          </span>
        </div>

        <span className="yo-hero__fold-marker" />
      </div>
    </>
  );
}
