import { useEffect, useId, useRef, useState } from 'react';

export function FooterScene() {
  const id = useId().replace(/:/g, '');
  const seaGradientId = `ft-sea-${id}`;
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
    <div ref={scene} className="footer-scene" data-animation-state={inView ? 'running' : 'paused'}>
      <svg
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
        role="img"
        aria-label="サンゴ礁と魚の群れが泳ぐ海の中"
      >
        <defs>
          <linearGradient id={seaGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="ft-sea-top" />
            <stop offset="1" className="ft-sea-bottom" />
          </linearGradient>
        </defs>

        <rect width="1200" height="240" fill={`url(#${seaGradientId})`} />

        <g className="ft-rays">
          <polygon className="ft-ray" points="300,0 360,0 250,240 150,240" />
          <polygon className="ft-ray" points="820,0 850,0 800,240 730,240" />
        </g>

        <g className="ft-fish-school ft-fish-school--a">
          <path
            className="ft-fish"
            d="M180 82 c10-9 28-9 37 0 c-9 9-27 9-37 0z M217 82 l11-8 v16z"
          />
          <path
            className="ft-fish"
            d="M232 100 c8-7 22-7 29 0 c-7 7-21 7-29 0z M261 100 l9-6 v12z"
          />
          <path
            className="ft-fish"
            d="M150 104 c7-6 19-6 25 0 c-6 6-18 6-25 0z M175 104 l8-5 v10z"
          />
        </g>
        <g className="ft-fish-school ft-fish-school--b">
          <path
            className="ft-fish"
            d="M760 66 c10-9 28-9 37 0 c-9 9-27 9-37 0z M797 66 l11-8 v16z"
          />
          <path
            className="ft-fish-accent"
            d="M704 88 c10-9 28-9 37 0 c-9 9-27 9-37 0z M741 88 l11-8 v16z"
          />
          <path className="ft-fish" d="M800 92 c7-6 19-6 25 0 c-6 6-18 6-25 0z M825 92 l8-5 v10z" />
        </g>

        <g className="ft-bubbles">
          <circle className="ft-bubble" cx="560" cy="170" r="6" />
          <circle className="ft-bubble" cx="572" cy="138" r="4" />
          <circle className="ft-bubble" cx="563" cy="110" r="3" />
          <circle className="ft-bubble" cx="1050" cy="160" r="5" />
          <circle className="ft-bubble" cx="1060" cy="130" r="3.5" />
        </g>

        <path className="ft-rock" d="M740 206 q34-40 70-2 q20-22 44 4z" />

        <g className="ft-weed-group ft-weed-group--a">
          <path className="ft-weed" d="M620 206 Q606 174 624 146 Q640 120 626 98" />
          <path className="ft-weed" d="M646 208 Q662 180 648 156" />
        </g>
        <g className="ft-weed-group ft-weed-group--b">
          <path className="ft-weed" d="M1110 204 Q1098 180 1114 158 Q1126 140 1116 124" />
          <path className="ft-weed" d="M60 206 Q48 184 62 162" />
        </g>

        <path
          className="ft-coral"
          d="M120 206 V156 M120 182 Q98 168 96 142 M120 172 Q142 160 146 136"
        />
        <path
          className="ft-coral"
          d="M980 204 V166 M980 184 Q964 174 962 154 M980 178 Q998 168 1000 148"
        />
        <g>
          <circle className="ft-coral-round" cx="420" cy="202" r="22" />
          <circle className="ft-coral-round" cx="452" cy="208" r="15" />
          <circle className="ft-coral-round" cx="396" cy="210" r="12" />
        </g>

        <path
          className="ft-sand"
          d="M0 240 V204 Q200 186 400 202 Q600 218 800 200 Q1000 184 1200 202 V240Z"
        />
        <path
          className="ft-sand-shade"
          d="M0 214 Q180 204 360 212 Q560 222 760 210 Q980 198 1200 212 V218 Q980 206 760 218 Q560 230 360 220 Q180 212 0 222Z"
        />
      </svg>
    </div>
  );
}
