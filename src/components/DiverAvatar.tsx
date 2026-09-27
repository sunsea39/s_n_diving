/* eslint-disable react-refresh/only-export-components */
import { useId } from 'react';

export const PALETTE = {
  skin: { light: '#F6D7C3', fair: '#EDC0A0', tan: '#D9A07A', brown: '#B8794F', deep: '#8A5634' },
  hair: {
    black: '#2B2522',
    brown: '#5A3A24',
    light: '#A8753F',
    blond: '#D8B26A',
    gray: '#8C9398',
    teal: '#1B998B'
  },
  suit: { navy: '#0B3C5D', black: '#22272B', teal: '#1B998B', coral: '#D64527' },
  bandana: {
    red: '#D64527',
    navy: '#0B3C5D',
    teal: '#1B998B',
    yellow: '#F3C969',
    pink: '#E88BA8',
    black: '#22272B',
    white: '#F4F4F2'
  },
  bg: {
    mist: '#EEF5F6',
    sea: '#CDEBE5',
    sand: '#FDE9C8',
    coral: '#F9D9D2',
    sky: '#DDE3F5',
    night: '#0B3C5D'
  }
} as const;
export const HAIR = {
  buzz: {
    label: 'ベリーショート',
    back: '',
    front: 'M36 52 C36 34 48 26 60 26 C72 26 84 34 84 52 C80 44 72 40 60 40 C48 40 40 44 36 52 Z'
  },
  short: {
    label: 'ショート',
    back: '',
    front:
      'M35 56 C33 36 46 25 61 25 C76 25 87 35 85 55 C82 47 77 42 71 40 C63 46 50 47 40 46 C38 49 36 52 35 56 Z'
  },
  bob: {
    label: 'ボブ',
    back: 'M32 60 C30 36 44 24 60 24 C76 24 90 36 88 60 L88 78 C88 82 84 84 80 82 L80 60 L40 60 L40 82 C36 84 32 82 32 78 Z',
    front: 'M36 54 C36 36 48 27 60 27 C72 27 84 36 84 54 C78 46 70 42 60 42 C50 42 42 46 36 54 Z'
  },
  long: {
    label: 'ロング',
    back: 'M30 60 C28 34 44 22 60 22 C76 22 92 34 90 60 L92 100 C84 104 80 100 80 96 L80 60 L40 60 L40 96 C40 100 36 104 28 100 Z',
    front: 'M36 56 C35 36 48 26 62 26 C76 26 86 36 84 54 C78 42 66 38 54 40 C46 42 40 48 36 56 Z'
  },
  pony: {
    label: 'ポニーテール',
    back: 'M80 38 C98 38 102 58 97 74 C95 80 90 82 88 78 C92 64 90 50 80 46 Z',
    front: 'M36 54 C36 36 48 27 60 27 C72 27 84 36 84 54 C78 46 70 42 60 42 C50 42 42 46 36 54 Z'
  },
  bun: {
    label: 'おだんご',
    back: 'M50 20 A10 10 0 1 1 70 20 A10 10 0 1 1 50 20 Z',
    front: 'M36 54 C36 36 48 27 60 27 C72 27 84 36 84 54 C78 46 70 42 60 42 C50 42 42 46 36 54 Z'
  }
} as const;
export const FACE = {
  smile: { label: 'にっこり' },
  calm: { label: 'ほほえみ' },
  wink: { label: 'ウインク' },
  cool: { label: 'きりっ' }
} as const;
export type AvatarStyle = {
  skin: keyof typeof PALETTE.skin;
  hair: keyof typeof HAIR;
  hairColor: keyof typeof PALETTE.hair;
  face: keyof typeof FACE;
  suit: keyof typeof PALETTE.suit;
  bg: keyof typeof PALETTE.bg;
  accessory: 'none' | 'mask' | 'bandana';
  bandanaColor: keyof typeof PALETTE.bandana;
};
type LegacyAvatarStyle = Omit<AvatarStyle, 'accessory' | 'bandanaColor'> & {
  mask: boolean;
  accessory?: AvatarStyle['accessory'];
  bandanaColor?: AvatarStyle['bandanaColor'];
};
export const DEFAULT_AVATAR_STYLE: AvatarStyle = {
  skin: 'fair',
  hair: 'short',
  hairColor: 'black',
  face: 'smile',
  suit: 'navy',
  bg: 'mist',
  accessory: 'none',
  bandanaColor: 'red'
};
export const PRESETS: (AvatarStyle & { name: string })[] = [
  { name: 'ショート・紺', ...DEFAULT_AVATAR_STYLE },
  {
    name: 'ボブ・ティール',
    skin: 'light',
    hair: 'bob',
    hairColor: 'brown',
    face: 'calm',
    suit: 'teal',
    bg: 'sand',
    accessory: 'none',
    bandanaColor: 'red'
  },
  {
    name: 'ロング・コーラル',
    skin: 'tan',
    hair: 'long',
    hairColor: 'black',
    face: 'wink',
    suit: 'coral',
    bg: 'sea',
    accessory: 'none',
    bandanaColor: 'red'
  },
  {
    name: 'ベリーショート・黒',
    skin: 'brown',
    hair: 'buzz',
    hairColor: 'black',
    face: 'cool',
    suit: 'black',
    bg: 'sky',
    accessory: 'none',
    bandanaColor: 'red'
  },
  {
    name: 'ポニーテール・マスク',
    skin: 'fair',
    hair: 'pony',
    hairColor: 'light',
    face: 'smile',
    suit: 'navy',
    bg: 'coral',
    accessory: 'mask',
    bandanaColor: 'red'
  },
  {
    name: 'おだんご・ティール',
    skin: 'light',
    hair: 'bun',
    hairColor: 'blond',
    face: 'calm',
    suit: 'teal',
    bg: 'mist',
    accessory: 'none',
    bandanaColor: 'red'
  },
  {
    name: 'ショート・マスク',
    skin: 'tan',
    hair: 'short',
    hairColor: 'brown',
    face: 'wink',
    suit: 'black',
    bg: 'sea',
    accessory: 'mask',
    bandanaColor: 'red'
  },
  {
    name: 'ロング・紺',
    skin: 'deep',
    hair: 'long',
    hairColor: 'black',
    face: 'smile',
    suit: 'navy',
    bg: 'sand',
    accessory: 'none',
    bandanaColor: 'red'
  },
  {
    name: 'ボブ・グレー',
    skin: 'fair',
    hair: 'bob',
    hairColor: 'gray',
    face: 'calm',
    suit: 'coral',
    bg: 'sky',
    accessory: 'none',
    bandanaColor: 'red'
  },
  {
    name: 'ベリーショート・夜',
    skin: 'light',
    hair: 'buzz',
    hairColor: 'light',
    face: 'smile',
    suit: 'teal',
    bg: 'night',
    accessory: 'none',
    bandanaColor: 'red'
  },
  {
    name: 'ポニーテール・黒',
    skin: 'brown',
    hair: 'pony',
    hairColor: 'black',
    face: 'cool',
    suit: 'black',
    bg: 'mist',
    accessory: 'none',
    bandanaColor: 'red'
  },
  {
    name: 'ショート・ティール髪',
    skin: 'fair',
    hair: 'short',
    hairColor: 'teal',
    face: 'wink',
    suit: 'navy',
    bg: 'sand',
    accessory: 'mask',
    bandanaColor: 'red'
  },
  {
    name: 'バンダナ・赤',
    skin: 'tan',
    hair: 'short',
    hairColor: 'black',
    face: 'smile',
    suit: 'teal',
    bg: 'sand',
    accessory: 'bandana',
    bandanaColor: 'red'
  },
  {
    name: 'バンダナ・紺',
    skin: 'fair',
    hair: 'long',
    hairColor: 'brown',
    face: 'calm',
    suit: 'coral',
    bg: 'mist',
    accessory: 'bandana',
    bandanaColor: 'navy'
  },
  {
    name: 'バンダナ・黄',
    skin: 'brown',
    hair: 'buzz',
    hairColor: 'black',
    face: 'wink',
    suit: 'navy',
    bg: 'sea',
    accessory: 'bandana',
    bandanaColor: 'yellow'
  },
  {
    name: 'バンダナ・ピンク',
    skin: 'light',
    hair: 'pony',
    hairColor: 'light',
    face: 'smile',
    suit: 'teal',
    bg: 'coral',
    accessory: 'bandana',
    bandanaColor: 'pink'
  }
];
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v * f)))
  );
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
export function normalizeAvatarStyle(value: unknown): AvatarStyle | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Partial<AvatarStyle & LegacyAvatarStyle>;
  const baseIsValid =
    typeof s.skin === 'string' &&
    s.skin in PALETTE.skin &&
    typeof s.hair === 'string' &&
    s.hair in HAIR &&
    typeof s.hairColor === 'string' &&
    s.hairColor in PALETTE.hair &&
    typeof s.face === 'string' &&
    s.face in FACE &&
    typeof s.suit === 'string' &&
    s.suit in PALETTE.suit &&
    typeof s.bg === 'string' &&
    s.bg in PALETTE.bg;
  if (!baseIsValid) return null;
  const accessory = s.accessory ?? (s.mask ? 'mask' : 'none');
  const bandanaColor = s.bandanaColor ?? 'red';
  if (!['none', 'mask', 'bandana'].includes(accessory) || !(bandanaColor in PALETTE.bandana))
    return null;
  return {
    skin: s.skin as AvatarStyle['skin'],
    hair: s.hair as AvatarStyle['hair'],
    hairColor: s.hairColor as AvatarStyle['hairColor'],
    face: s.face as AvatarStyle['face'],
    suit: s.suit as AvatarStyle['suit'],
    bg: s.bg as AvatarStyle['bg'],
    accessory,
    bandanaColor: bandanaColor as AvatarStyle['bandanaColor']
  };
}
export function isAvatarStyle(value: unknown): value is AvatarStyle {
  return normalizeAvatarStyle(value) !== null;
}
export function DiverAvatar({ style, title }: { style: AvatarStyle; title?: string }) {
  const clip = useId().replace(/:/g, '');
  const s = PALETTE.skin[style.skin],
    h = PALETTE.hair[style.hairColor],
    w = PALETTE.suit[style.suit],
    b = PALETTE.bg[style.bg],
    H = HAIR[style.hair],
    ink = '#2B2522',
    collar = style.suit === 'teal' ? '#0B3C5D' : '#1B998B';
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <circle cx="60" cy="60" r="60" fill={b} />
        {H.back && <path d={H.back} fill={h} />}
        <path d="M18 122 C22 97 40 87 60 87 C80 87 98 97 102 122 Z" fill={w} />
        <path
          d="M50 88 L60 101 L70 88"
          fill="none"
          stroke={collar}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="52" y="76" width="16" height="13" rx="4" fill={shade(s, 0.93)} />
        <ellipse cx="35.5" cy="60" rx="4.5" ry="6" fill={s} />
        <ellipse cx="84.5" cy="60" rx="4.5" ry="6" fill={s} />
        <ellipse cx="60" cy="58" rx="24" ry="27" fill={s} />
        <circle cx="46" cy="66" r="4" fill="#E88B7A" opacity=".28" />
        <circle cx="74" cy="66" r="4" fill="#E88B7A" opacity=".28" />
        {style.face === 'smile' && (
          <>
            <path
              d="M48 59 q4 -5 8 0 M64 59 q4 -5 8 0"
              fill="none"
              stroke={ink}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M52 70 q8 8 16 0"
              fill="none"
              stroke={ink}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </>
        )}
        {style.face === 'calm' && (
          <>
            <circle cx="52" cy="58" r="2.6" fill={ink} />
            <circle cx="68" cy="58" r="2.6" fill={ink} />
            <path
              d="M54 70 q6 5 12 0"
              fill="none"
              stroke={ink}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        )}
        {style.face === 'wink' && (
          <>
            <circle cx="52" cy="58" r="2.6" fill={ink} />
            <path
              d="M64 58 q4 -4 8 0"
              fill="none"
              stroke={ink}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M53 69 q7 7 14 0"
              fill="none"
              stroke={ink}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </>
        )}
        {style.face === 'cool' && (
          <>
            <path
              d="M46 51 l9 -2 M74 51 l-9 -2"
              stroke={ink}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="52" cy="58" r="2.6" fill={ink} />
            <circle cx="68" cy="58" r="2.6" fill={ink} />
            <path
              d="M55 71 q5 2 10 0"
              fill="none"
              stroke={ink}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        )}
        <path d={H.front} fill={h} />
        {style.accessory === 'bandana' && <Bandana color={PALETTE.bandana[style.bandanaColor]} />}
        {style.accessory === 'mask' && (
          <>
            <path
              d="M35 44 C45 39 75 39 85 44"
              fill="none"
              stroke="#22272B"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <rect
              x="43"
              y="32"
              width="34"
              height="13"
              rx="6.5"
              fill="#BFE6E0"
              stroke="#0B3C5D"
              strokeWidth="2.5"
            />
            <line x1="60" y1="33" x2="60" y2="44" stroke="#0B3C5D" strokeWidth="2" />
          </>
        )}
      </g>
    </svg>
  );
}

function Bandana({ color }: { color: string }) {
  const dot = color === '#F4F4F2' || color === '#F3C969' ? '#0B3C5D' : '#FFFFFF';
  return (
    <>
      <path d="M35.5 47 C44 39.5 76 39.5 84.5 47 L84 54 C76 46.5 44 46.5 36 54 Z" fill={color} />
      <g fill={dot} opacity=".85">
        <circle cx="44" cy="46.2" r="1.3" />
        <circle cx="52" cy="44.4" r="1.3" />
        <circle cx="60" cy="43.8" r="1.3" />
        <circle cx="68" cy="44.4" r="1.3" />
        <circle cx="76" cy="46.2" r="1.3" />
      </g>
      <circle cx="86" cy="50.5" r="3.6" fill={color} />
      <path d="M88.5 49.5 L98 43.5 L96 52.5 Z" fill={color} />
      <path d="M88.5 52 L97 59 L91.5 59.5 Z" fill={color} />
    </>
  );
}
