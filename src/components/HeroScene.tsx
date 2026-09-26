import { useEffect, useId, useRef, useState } from 'react';

export function HeroScene() {
  const id = useId().replace(/:/g, '');
  const seaGradientId = `hs-sea-${id}`;
  const scene = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = scene.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={scene}
      className="hero-scene"
      data-animation-state={inView ? 'running' : 'paused'}
      role="img"
      aria-label="海面にダイビングフラッグのブイが浮かび、海中を魚と泡が泳ぐイラスト"
    >
      <svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={seaGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="hs-sea-top" />
            <stop offset="0.55" className="hs-sea-mid" />
            <stop offset="1" className="hs-sea-deep" />
          </linearGradient>
        </defs>

        <rect className="hs-sky" x="0" y="0" width="1200" height="120" />
        <circle className="hs-sun" cx="960" cy="64" r="34" />

        <g className="hs-waves-back">
          <path
            className="hs-wave-back"
            d="M0 104 Q50 90 100 104 T200 104 T300 104 T400 104 T500 104 T600 104 T700 104 T800 104 T900 104 T1000 104 T1100 104 T1200 104 T1300 104 T1400 104 V140 H0 Z"
          />
        </g>
        <g className="hs-waves-front">
          <path
            fill={`url(#${seaGradientId})`}
            d="M0 112 Q60 98 120 112 T240 112 T360 112 T480 112 T600 112 T720 112 T840 112 T960 112 T1080 112 T1200 112 T1320 112 T1440 112 V360 H0 Z"
          />
        </g>

        <g className="hs-rays">
          <polygon className="hs-ray" points="880,112 940,112 760,360 620,360" />
          <polygon className="hs-ray" points="980,112 1010,112 930,360 850,360" />
          <polygon className="hs-ray" points="1040,112 1060,112 1110,360 1050,360" />
        </g>

        <g className="hs-buoy-group">
          <line className="hs-pole" x1="236" y1="54" x2="236" y2="104" />
          <rect className="hs-flag" x="238" y="54" width="44" height="30" rx="2" />
          <polygon className="hs-flag-stripe" points="238,54 247,54 282,78 282,84 273,84 238,60" />
          <ellipse className="hs-buoy" cx="236" cy="108" rx="20" ry="9" />
        </g>

        <g className="hs-fish-school">
          <g transform="translate(420 190)">
            <path
              className="hs-fish"
              d="M0 0 C14 -12 38 -12 50 0 C38 12 14 12 0 0 Z M50 0 L64 -10 L64 10 Z"
            />
          </g>
          <g transform="translate(486 214) scale(.8)">
            <path
              className="hs-fish"
              d="M0 0 C14 -12 38 -12 50 0 C38 12 14 12 0 0 Z M50 0 L64 -10 L64 10 Z"
            />
          </g>
          <g transform="translate(470 168) scale(.65)">
            <path
              className="hs-fish"
              d="M0 0 C14 -12 38 -12 50 0 C38 12 14 12 0 0 Z M50 0 L64 -10 L64 10 Z"
            />
          </g>
          <g transform="translate(540 186) scale(.7)">
            <path
              className="hs-fish-accent"
              d="M0 0 C14 -12 38 -12 50 0 C38 12 14 12 0 0 Z M50 0 L64 -10 L64 10 Z"
            />
          </g>
        </g>

        <g className="hs-bubbles">
          <circle className="hs-bubble" cx="760" cy="300" r="7" />
          <circle className="hs-bubble" cx="774" cy="262" r="5" />
          <circle className="hs-bubble" cx="764" cy="226" r="4" />
          <circle className="hs-bubble" cx="778" cy="196" r="3" />
          <circle className="hs-bubble" cx="150" cy="286" r="5" />
          <circle className="hs-bubble" cx="160" cy="250" r="3.5" />
          <circle className="hs-bubble" cx="1100" cy="300" r="5" />
          <circle className="hs-bubble" cx="1092" cy="262" r="3.5" />
        </g>

        <g className="hs-seabed">
          <path
            className="hs-rock"
            d="M0 360 V322 Q80 296 170 318 Q240 334 300 312 Q380 286 470 318 Q560 346 660 324 Q760 300 860 322 Q960 344 1060 316 Q1130 298 1200 314 V360 Z"
          />
          <path
            className="hs-coral"
            d="M330 316 V282 M330 298 Q316 290 314 272 M330 292 Q346 284 348 266"
          />
          <circle className="hs-coral-2" cx="900" cy="316" r="14" />
          <circle className="hs-coral-2" cx="922" cy="320" r="10" />
          <path className="hs-weed" d="M620 330 Q610 300 624 276 Q636 254 626 232" />
          <path className="hs-weed" d="M640 332 Q652 308 642 288" />
          <path className="hs-weed" d="M1010 318 Q1000 292 1014 270" />
        </g>
      </svg>
    </div>
  );
}
