// Original explanatory figures for the ダイビング入門 docs, drawn by Claude.
// Run: node scripts/figures/build-figures.mjs  → writes public/figures/*.svg
// Every figure carries its own white card background so it reads the same in light and dark themes.
import { mkdirSync, writeFileSync } from 'node:fs';

const C = {
  navy: '#0B3C5D', teal: '#1B998B', tealLight: '#7FC9BF', sea: '#CDEBE5', seaDeep: '#15717A', mist: '#EEF5F6',
  line: '#D5E6EA', red: '#D64527', amber: '#D98E04', yellow: '#F3C969', ink: '#4F5B62', muted: '#7A8A92', white: '#FFFFFF', sand: '#E9DFC6'
};
const FONT = `font-family="Noto Sans JP, Hiragino Sans, Meiryo, sans-serif"`;
const W = 640, H = 360;

const t = (x, y, s, { size = 15, weight = 700, fill = C.navy, anchor = 'start' } = {}) =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${s}</text>`;
const card = (title, body, { w = W, h = H, desc = title } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${desc}">
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="16" fill="${C.white}" stroke="${C.line}" stroke-width="2"/>
  ${t(24, 38, title, { size: 18 })}
  ${body}
</svg>`;
const arrow = (x1, y1, x2, y2, color = C.navy, width = 3) => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 10;
  const p1 = [x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)], p2 = [x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><polygon points="${x2},${y2} ${p1.join(',')} ${p2.join(',')}" fill="${color}"/>`;
};
// A simple side-view diver: body capsule, head, tank, fins. (x,y) is the chest.
const diver = (x, y, { scale = 1, color = C.navy, rot = 0 } = {}) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">
  <rect x="-10" y="-17" width="40" height="11" rx="5.5" fill="${C.amber}"/>
  <rect x="-30" y="-8" width="62" height="18" rx="9" fill="${color}"/>
  <circle cx="42" cy="-1" r="10" fill="${color}"/>
  <rect x="44" y="-6" width="10" height="7" rx="2" fill="${C.sea}" stroke="${color}" stroke-width="2"/>
  <path d="M-30 -2 L-52 -10 L-56 2 L-30 6 Z" fill="${C.teal}"/>
</g>`;
const bubble = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${C.tealLight}" stroke-width="2"/>`;

const figures = {};

// 1-1 水深と見える色
figures['fig-1-1-color-depth'] = card('潜るほど赤から順に色が消える', (() => {
  const top = 70, px = 11; // 1m = 11px (0-22m)
  const depths = [0, 5, 10, 15, 20];
  let s = `<rect x="40" y="${top}" width="140" height="${22 * px}" fill="url(#g)" rx="6"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FD3E0"/><stop offset="1" stop-color="${C.navy}"/></linearGradient></defs>`;
  depths.forEach((d) => { s += `<line x1="180" y1="${top + d * px}" x2="192" y2="${top + d * px}" stroke="${C.ink}" stroke-width="1.5"/>${t(198, top + d * px + 5, `${d}m`, { size: 13, weight: 400, fill: C.ink })}`; });
  const colors = [['赤', '#E0433A', 5], ['橙', '#F08A24', 10], ['黄', '#F3C94A', 20], ['緑', '#3BAA5C', 22], ['青', '#2F6FD6', 22]];
  colors.forEach(([name, col, d], i) => {
    const x = 270 + i * 64;
    s += `<rect x="${x}" y="${top}" width="30" height="${d * px}" rx="6" fill="${col}"/>${t(x + 15, top - 8, name, { size: 14, anchor: 'middle' })}`;
    if (d < 22) s += t(x + 15, top + d * px + 20, `〜${d}m`, { size: 12, weight: 400, fill: C.ink, anchor: 'middle' });
    else s += t(x + 15, top + 22 * px + 20, '深くまで', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' });
  });
  s += t(24, 368, '※ 目安。天気や水の濁りで変わる。本当の色はライトで照らすと戻る', { size: 12, weight: 400, fill: C.muted });
  return s;
})(), { h: 384 });

// 1-2 屈折
figures['fig-1-2-refraction'] = card('マスク越しだと、大きく・近くに見える', `
  <rect x="24" y="70" width="592" height="230" rx="10" fill="${C.sea}"/>
  <g transform="translate(70 185)"><circle r="34" fill="${C.navy}"/><rect x="16" y="-14" width="26" height="22" rx="5" fill="${C.mist}" stroke="${C.navy}" stroke-width="3"/></g>
  ${t(55, 250, 'ダイバー', { size: 13, fill: C.navy })}
  <line x1="112" y1="185" x2="560" y2="185" stroke="${C.muted}" stroke-dasharray="6 6"/>
  <g transform="translate(470 185)"><path d="M0 0 c14-13 40-13 54 0 c-14 13-40 13-54 0z M54 0 l16-11 v22z" fill="${C.teal}"/></g>
  ${t(500, 225, '実際の魚', { size: 13, fill: C.teal, anchor: 'middle' })}
  <g transform="translate(330 185) scale(1.33)" opacity=".55"><path d="M0 0 c14-13 40-13 54 0 c-14 13-40 13-54 0z M54 0 l16-11 v22z" fill="${C.amber}"/></g>
  ${t(370, 145, '見える魚（約4/3倍の大きさ）', { size: 13, fill: C.amber, anchor: 'middle' })}
  ${arrow(112, 280, 470, 280, C.teal)}${t(290, 272, '実際の距離', { size: 12, fill: C.teal, anchor: 'middle' })}
  ${arrow(112, 300, 330, 300, C.amber)}${t(220, 318, '見える距離（約3/4）', { size: 12, fill: C.amber, anchor: 'middle' })}
  ${t(24, 345, '岩のすき間が「通れそう」に見えても、実際はもっと狭いことがある', { size: 12, weight: 400, fill: C.muted })}`);

// 1-4 水深と絶対圧
figures['fig-1-4-pressure'] = card('10m潜るごとに1気圧ふえる', (() => {
  let s = '';
  [[0, 1], [10, 2], [20, 3], [30, 4]].forEach(([d, atm], i) => {
    const x = 90 + i * 130, base = 310, unit = 50;
    s += `<rect x="${x}" y="${base - unit}" width="70" height="${unit}" fill="${C.sea}" stroke="${C.tealLight}"/>`;
    if (atm > 1) s += `<rect x="${x}" y="${base - unit * atm}" width="70" height="${unit * (atm - 1)}" fill="${C.teal}"/>`;
    s += t(x + 35, base - unit * atm - 10, `${atm}気圧`, { size: 16, anchor: 'middle' });
    s += t(x + 35, base + 24, `水深${d}m`, { size: 14, weight: 400, fill: C.ink, anchor: 'middle' });
  });
  s += `<rect x="440" y="52" width="16" height="12" fill="${C.sea}" stroke="${C.tealLight}"/>${t(462, 63, '大気の重さ（1気圧）', { size: 12, weight: 400, fill: C.ink })}
  <rect x="440" y="72" width="16" height="12" fill="${C.teal}"/>${t(462, 83, '水の重さ（水圧）', { size: 12, weight: 400, fill: C.ink })}`;
  return s;
})());

// 1-5 ボイルの法則
figures['fig-1-5-boyle'] = card('潜ると空気は縮み、浮上すると膨らむ', (() => {
  let s = `<rect x="24" y="60" width="592" height="250" rx="10" fill="${C.mist}"/>`;
  [[0, 12, 1], [10, 6, 2], [20, 4, 3], [30, 3, 4]].forEach(([d, l, atm], i) => {
    const cx = 100 + i * 145, r = 16 + Math.sqrt(l) * 13, cy = 175;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${r * 0.85}" ry="${r}" fill="${C.amber}" opacity=".85"/><path d="M${cx} ${cy + r} l-6 10 h12 z" fill="${C.amber}"/>`;
    s += `<line x1="${cx}" y1="${cy + r + 10}" x2="${cx}" y2="${cy + r + 26}" stroke="${C.ink}" stroke-width="1.5"/>`;
    s += t(cx, 290, `${d}m ・ ${atm}気圧`, { size: 14, anchor: 'middle' }) + t(cx, cy + 6, `${l}ℓ`, { size: 16, anchor: 'middle', fill: C.white });
  });
  s += arrow(470, 90, 150, 90, C.teal) + t(310, 82, '浮上すると膨らむ', { size: 13, fill: C.teal, anchor: 'middle' });
  return s;
})());

// 1-6 浮上中の体積変化
figures['fig-1-6-ascent-volume'] = card('いちばん膨らむのは水面近く（10m→0m）', (() => {
  let s = '';
  const data = [['30m', 3], ['20m', 4], ['10m', 6], ['水面', 12]];
  data.forEach(([label, v], i) => {
    const x = 80 + i * 130, base = 300, hh = v * 16;
    const col = i === 3 ? C.red : C.teal;
    s += `<rect x="${x}" y="${base - hh}" width="64" height="${hh}" rx="6" fill="${col}"/>`;
    s += t(x + 32, base - hh - 8, `${v}ℓ`, { size: 16, anchor: 'middle', fill: col });
    s += t(x + 32, base + 22, label, { size: 14, weight: 400, fill: C.ink, anchor: 'middle' });
  });
  s += `<rect x="24" y="56" width="300" height="54" rx="10" fill="#FBE4DE"/>${t(40, 80, '10m→水面で体積は2倍に', { size: 14, fill: C.red })}${t(40, 100, '浮上中は絶対に息を止めない', { size: 13, weight: 400, fill: C.red })}`;
  return s;
})());

// 1-8 耳抜き
figures['fig-1-8-ear'] = card('耳抜き：鼓膜の内と外の圧力をそろえる', (() => {
  const panel = (x, label, bowed, ok) => `
    <rect x="${x}" y="60" width="280" height="250" rx="12" fill="${C.mist}"/>
    ${t(x + 140, 88, label, { size: 15, anchor: 'middle', fill: ok ? C.teal : C.red })}
    <rect x="${x + 20}" y="160" width="100" height="40" fill="${C.sea}"/>${t(x + 70, 230, '外耳（水圧）', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}
    ${bowed ? `<path d="M${x + 132} 140 Q${x + 150} 180 ${x + 132} 220" fill="none" stroke="${C.red}" stroke-width="5"/>` : `<line x1="${x + 132}" y1="140" x2="${x + 132}" y2="220" stroke="${C.teal}" stroke-width="5"/>`}
    ${t(x + 132, 128, '鼓膜', { size: 12, anchor: 'middle', fill: bowed ? C.red : C.teal })}
    <ellipse cx="${x + 190}" cy="180" rx="44" ry="36" fill="${C.white}" stroke="${C.line}" stroke-width="2"/>${t(x + 190, 185, '中耳', { size: 13, anchor: 'middle', fill: C.navy })}
    <path d="M${x + 205} 214 Q${x + 225} 260 ${x + 250} 290" fill="none" stroke="${C.tealLight}" stroke-width="10" stroke-linecap="round"/>
    ${t(x + 200, 300, '耳管（のどへ）', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}
    ${bowed ? arrow(x + 60, 180, x + 122, 180, C.red) : arrow(x + 240, 280, x + 214, 222, C.teal)}`;
  return panel(24, '耳抜き前：鼓膜が内側へ押される', true, false) + panel(336, '耳抜き後：耳管から空気が入り平らに', false, true);
})());

// 2-19 中性浮力
figures['fig-2-19-buoyancy'] = card('沈む・中性浮力・浮く', `
  <rect x="24" y="60" width="592" height="250" rx="10" fill="${C.sea}"/>
  ${diver(120, 200, { scale: 0.8 })}${arrow(120, 218, 120, 258, C.red)}${t(120, 280, '沈む', { size: 16, anchor: 'middle', fill: C.red })}${t(120, 300, '重さ ＞ 浮力', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}
  ${diver(320, 190, { scale: 0.8 })}${t(320, 280, '中性浮力', { size: 16, anchor: 'middle', fill: C.teal })}${t(320, 300, '重さ ＝ 浮力（止まっていられる）', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}
  ${diver(520, 130, { scale: 0.8 })}${arrow(520, 110, 520, 72, C.amber)}${t(520, 280, '浮く', { size: 16, anchor: 'middle', fill: C.amber })}${t(520, 300, '重さ ＜ 浮力', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}
  ${t(24, 340, '調整はBCDに少しずつ空気を入れて。呼吸でも浮き沈みする（吸うと浮く・吐くと沈む）', { size: 12, weight: 400, fill: C.muted })}`);

// 2-21 浮上プロファイルと安全停止
figures['fig-2-21-ascent-profile'] = card('ゆっくり浮上し、安全停止をする', (() => {
  const x0 = 70, y0 = 80, px = 7, tx = 11; // depth px per m, time px per min
  const Y = (d) => y0 + d * px, X = (m) => x0 + m * tx;
  const path = [[0, 0], [3, 25], [30, 25], [33, 5], [36, 5], [37, 0]].map(([m, d], i) => `${i ? 'L' : 'M'}${X(m)} ${Y(d)}`).join(' ');
  let s = `<line x1="${x0}" y1="${y0}" x2="${X(40)}" y2="${y0}" stroke="${C.tealLight}" stroke-width="3"/>${t(X(40), y0 - 8, '水面', { size: 12, weight: 400, fill: C.ink, anchor: 'end' })}`;
  [5, 10, 15, 20, 25].forEach((d) => { s += `<line x1="${x0}" y1="${Y(d)}" x2="${X(40)}" y2="${Y(d)}" stroke="${C.line}"/>${t(x0 - 8, Y(d) + 4, `${d}m`, { size: 11, weight: 400, fill: C.muted, anchor: 'end' })}`; });
  s += `<rect x="${X(33)}" y="${Y(3)}" width="${3 * tx}" height="${4 * px}" fill="${C.yellow}" opacity=".5"/>`;
  s += `<path d="${path}" fill="none" stroke="${C.navy}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<line x1="${X(30)}" y1="${Y(25)}" x2="${X(33)}" y2="${Y(5)}" stroke="${C.teal}" stroke-width="6" stroke-linecap="round" opacity=".6"/>`;
  s += t(X(22), Y(15), 'ゆっくり浮上', { size: 13, fill: C.teal }) + t(X(22), Y(15) + 18, '（毎分9m以下が目安）', { size: 12, weight: 400, fill: C.ink });
  s += t(X(33) + 50, Y(5) + 4, '安全停止', { size: 13, fill: C.amber }) + t(X(33) + 50, Y(5) + 22, '5m付近で3分', { size: 12, weight: 400, fill: C.ink });
  s += t(24, 345, '※ 浮上速度・停止時間はダイブコンピューターの表示とガイドの指示に従う', { size: 12, weight: 400, fill: C.muted });
  return s;
})());

// 2-24 バディとの距離
figures['fig-2-24-buddy-distance'] = card('バディとは手の届く距離で', `
  <rect x="24" y="60" width="286" height="240" rx="12" fill="#E3F4EF"/>${t(167, 90, '◎ 手が届く（1〜2m）', { size: 15, fill: C.teal, anchor: 'middle' })}
  ${diver(110, 190, { scale: 0.75 })}${diver(220, 215, { scale: 0.75, color: C.seaDeep })}
  <line x1="150" y1="200" x2="190" y2="210" stroke="${C.teal}" stroke-width="2" stroke-dasharray="4 4"/>
  <rect x="330" y="60" width="286" height="240" rx="12" fill="#FBE4DE"/>${t(473, 90, '× 離れすぎ', { size: 15, fill: C.red, anchor: 'middle' })}
  ${diver(380, 170, { scale: 0.6 })}${diver(560, 260, { scale: 0.6, color: C.seaDeep })}
  <line x1="410" y1="176" x2="540" y2="252" stroke="${C.red}" stroke-width="2" stroke-dasharray="4 4"/>
  ${t(24, 335, '数分おきに振り返って合図し合う。見失ったら「1分探して、見つからなければ浮上」', { size: 12, weight: 400, fill: C.muted })}`);

// 2-26 残圧計
figures['fig-2-26-gauge'] = card('残圧計：赤い範囲に入る前に浮上を始める', (() => {
  const cx = 200, cy = 205, r = 120;
  const ang = (v) => Math.PI * (0.75 + 1.5 * (v / 300)); // 0..300 bar over 270°
  const pt = (v, rr) => [cx + rr * Math.cos(ang(v)), cy + rr * Math.sin(ang(v))];
  const arc = (a, b, col) => { const [x1, y1] = pt(a, r - 12), [x2, y2] = pt(b, r - 12); const large = (b - a) / 300 * 270 > 180 ? 1 : 0; return `<path d="M${x1} ${y1} A${r - 12} ${r - 12} 0 ${large} 1 ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="16"/>`; };
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.white}" stroke="${C.navy}" stroke-width="8"/>` + arc(0, 50, C.red) + arc(50, 300, C.sea);
  for (let v = 0; v <= 300; v += 50) { const [x1, y1] = pt(v, r - 30), [lx, ly] = pt(v, r - 50); s += `<circle cx="${x1}" cy="${y1}" r="2.5" fill="${C.navy}"/>${t(lx, ly + 5, `${v}`, { size: 13, anchor: 'middle' })}`; }
  const [nx, ny] = pt(70, r - 28);
  s += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${C.navy}" stroke-width="5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="8" fill="${C.navy}"/>${t(cx, cy + 60, 'bar', { size: 13, weight: 400, fill: C.ink, anchor: 'middle' })}`;
  s += `<rect x="370" y="90" width="246" height="190" rx="12" fill="${C.mist}"/>
    ${t(386, 120, '決めておくこと', { size: 15 })}
    ${t(386, 150, '・浮上を始める残圧（例：50bar）', { size: 13, weight: 400, fill: C.ink })}
    ${t(386, 175, '・途中で合図する残圧（例：100bar）', { size: 13, weight: 400, fill: C.ink })}
    ${t(386, 200, '・5〜10分ごとに残圧を見る', { size: 13, weight: 400, fill: C.ink })}
    ${t(386, 235, '赤い範囲＝残りわずか', { size: 13, fill: C.red })}
    ${t(386, 258, '（数値はガイドの指示に従う）', { size: 12, weight: 400, fill: C.muted })}`;
  return s;
})());

// 3-1 / 3-2 空気の減り方
figures['fig-3-2-air-duration'] = card('深いほど、同じタンクでも早く空気が減る', (() => {
  let s = '';
  [['水面', 1], ['10m', 2], ['20m', 3], ['30m', 4]].forEach(([label, atm], i) => {
    const y = 80 + i * 60, w = 440 / atm;
    s += t(90, y + 24, label, { size: 14, anchor: 'end' });
    s += `<rect x="110" y="${y}" width="${w}" height="34" rx="8" fill="${i ? C.teal : C.tealLight}"/>`;
    s += t(110 + w + 10, y + 23, i === 0 ? '基準' : `約1/${atm}`, { size: 14, fill: C.navy });
  });
  s += t(24, 340, '1回の呼吸で吸う空気の量が、2気圧なら2倍、3気圧なら3倍になるため（目安の比率）', { size: 12, weight: 400, fill: C.muted });
  return s;
})());

// 3-7 窒素酔い
figures['fig-3-7-narcosis'] = card('窒素酔いは深くなるほど出やすい', (() => {
  let s = `<defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.sea}"/><stop offset=".55" stop-color="${C.sea}"/><stop offset=".7" stop-color="${C.yellow}"/><stop offset="1" stop-color="${C.red}"/></linearGradient></defs>
    <rect x="70" y="60" width="60" height="260" rx="8" fill="url(#n)"/>`;
  [0, 10, 20, 30, 40].forEach((d) => { const y = 60 + d * 6.5; s += `<line x1="130" y1="${y}" x2="142" y2="${y}" stroke="${C.ink}"/>${t(148, y + 5, `${d}m`, { size: 12, weight: 400, fill: C.ink })}`; });
  s += `<rect x="220" y="80" width="396" height="220" rx="12" fill="${C.mist}"/>
    ${t(238, 112, '30m前後から出やすくなる症状', { size: 15 })}
    ${t(238, 144, '・お酒に酔ったように気分が高まる／不安になる', { size: 13, weight: 400, fill: C.ink })}
    ${t(238, 170, '・考えがまとまらない、計器の数字が読めない', { size: 13, weight: 400, fill: C.ink })}
    ${t(238, 196, '・注意が狭くなる（残圧やバディを見なくなる）', { size: 13, weight: 400, fill: C.ink })}
    ${t(238, 234, 'おかしいと思ったら、少し浅い所へ上がる', { size: 14, fill: C.teal })}
    ${t(238, 258, '浅くなれば症状は消える', { size: 13, weight: 400, fill: C.ink })}`;
  return s;
})());

// 3-8 炭酸飲料のたとえ
figures['fig-3-8-soda'] = card('減圧症は炭酸飲料のふたを開けたときに似ている', (() => {
  const bottle = (x, label, bubbles, col) => {
    let s = `<rect x="${x}" y="90" width="90" height="190" rx="22" fill="${C.sea}" stroke="${C.navy}" stroke-width="3"/><rect x="${x + 28}" y="66" width="34" height="28" rx="4" fill="${col}"/>`;
    for (const [bx, by, r] of bubbles) s += bubble(x + bx, by, r);
    return s + t(x + 45, 310, label, { size: 13, anchor: 'middle', fill: C.navy });
  };
  const many = [[20, 250, 6], [50, 230, 8], [70, 200, 5], [30, 190, 7], [60, 160, 6], [40, 130, 5], [70, 120, 7], [20, 150, 4]];
  return bottle(70, 'ゆっくり開ける', [[45, 230, 4], [30, 180, 3]], C.teal) + bottle(250, '急に開ける', many, C.red) +
    `<rect x="380" y="90" width="236" height="190" rx="12" fill="${C.mist}"/>
    ${t(396, 120, '体の中でも同じ', { size: 15 })}
    ${t(396, 150, '潜ると窒素が体に溶け込む', { size: 13, weight: 400, fill: C.ink })}
    ${t(396, 176, '急に浮上すると泡になる', { size: 13, weight: 400, fill: C.red })}
    ${t(396, 214, 'ゆっくり浮上＋安全停止で', { size: 13, fill: C.teal })}
    ${t(396, 238, '少しずつ抜く', { size: 13, fill: C.teal })}`;
})());

// 3-10 飛行機までの時間
figures['fig-3-10-flight'] = card('ダイビング後の飛行機は時間をあけて', `
  <line x1="60" y1="190" x2="580" y2="190" stroke="${C.line}" stroke-width="8" stroke-linecap="round"/>
  <line x1="60" y1="190" x2="480" y2="190" stroke="${C.amber}" stroke-width="8" stroke-linecap="round"/>
  <circle cx="60" cy="190" r="14" fill="${C.teal}"/>${t(40, 160, '最後のダイビング', { size: 14, fill: C.teal })}
  ${t(270, 230, '24時間を目安にあける', { size: 16, anchor: 'middle', fill: C.amber })}
  <g transform="translate(540 190)"><path d="M-30 0 L30 -6 L36 0 L30 6 Z" fill="${C.navy}"/><path d="M-4 -3 L-18 -24 L-8 -24 L12 -3 Z M-4 3 L-18 24 L-8 24 L12 3 Z" fill="${C.navy}"/></g>
  ${t(540, 240, '飛行機・高い山', { size: 13, anchor: 'middle' })}
  <rect x="60" y="270" width="520" height="54" rx="10" fill="${C.mist}"/>
  ${t(76, 294, '高い所では気圧が下がり、体の窒素が泡になりやすい', { size: 13, weight: 400, fill: C.ink })}
  ${t(76, 314, '時間はダイブコンピューターの表示に従う', { size: 13, fill: C.navy })}`);

// 3-12 肺の過膨張
figures['fig-3-12-lung'] = card('浮上中に息を止めると、肺が膨らみすぎる', (() => {
  const lung = (x, s, col, label, sub) => `<g transform="translate(${x} 185) scale(${s})"><path d="M-6 -60 v30 M6 -60 v30" stroke="${C.ink}" stroke-width="5"/>
      <path d="M-8 -30 C-60 -40 -70 40 -30 55 C-12 60 -8 30 -8 -30 Z M8 -30 C60 -40 70 40 30 55 C12 60 8 30 8 -30 Z" fill="${col}"/></g>
    ${t(x, 300, label, { size: 14, anchor: 'middle', fill: col === C.red ? C.red : C.navy })}${t(x, 320, sub, { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}`;
  return lung(120, 1, C.tealLight, '呼吸を続ける', '空気が抜けて安全') + arrow(200, 185, 240, 185, C.muted) +
    lung(320, 1.2, C.amber, '息を止めて浮上', '空気が膨らむ') + arrow(410, 185, 450, 185, C.muted) +
    lung(520, 1.4, C.red, '肺が傷つくおそれ', '空気塞栓症など重い症状に');
})());

// 5-7 大潮と小潮
figures['fig-5-7-tides'] = card('大潮と小潮：月と太陽の並び方', (() => {
  const earth = (x, y) => `<circle cx="${x}" cy="${y}" r="26" fill="${C.teal}"/><ellipse cx="${x}" cy="${y}" rx="42" ry="30" fill="none" stroke="${C.tealLight}" stroke-width="3" stroke-dasharray="5 4"/>`;
  const sun = (x, y) => `<circle cx="${x}" cy="${y}" r="24" fill="${C.yellow}"/>`;
  const moon = (x, y) => `<circle cx="${x}" cy="${y}" r="12" fill="${C.muted}"/>`;
  return `<rect x="24" y="60" width="286" height="240" rx="12" fill="${C.mist}"/>${t(167, 90, '大潮（満月・新月のころ）', { size: 14, anchor: 'middle' })}
    ${sun(60, 190)}${earth(180, 190)}${moon(270, 190)}<line x1="84" y1="190" x2="258" y2="190" stroke="${C.amber}" stroke-dasharray="4 4"/>
    ${t(167, 270, '一直線 → 潮の差が大きく、流れも速い', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}
    <rect x="330" y="60" width="286" height="240" rx="12" fill="${C.mist}"/>${t(473, 90, '小潮（半月のころ）', { size: 14, anchor: 'middle' })}
    ${sun(366, 190)}${earth(480, 190)}${moon(480, 120)}<line x1="390" y1="190" x2="454" y2="190" stroke="${C.amber}" stroke-dasharray="4 4"/><line x1="480" y1="132" x2="480" y2="164" stroke="${C.amber}" stroke-dasharray="4 4"/>
    ${t(473, 270, '直角 → 潮の差が小さく、流れもおだやか', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}`;
})());

// 5-9 離岸流
figures['fig-5-9-rip'] = card('離岸流に流されたら、岸と平行に泳ぐ', `
  <rect x="24" y="60" width="592" height="200" rx="10" fill="${C.sea}"/>
  <rect x="24" y="260" width="592" height="70" rx="10" fill="${C.sand}"/>${t(320, 305, '岸（砂浜）', { size: 13, anchor: 'middle', fill: C.ink })}
  ${[100, 180, 460, 540].map((x) => `<path d="M${x - 40} 240 q20 -12 40 0 t40 0" fill="none" stroke="${C.white}" stroke-width="3"/>`).join('')}
  <path d="M290 262 L290 110 Q320 80 350 110 L350 262 Z" fill="${C.seaDeep}" opacity=".35"/>
  ${arrow(320, 250, 320, 100, C.red, 4)}${t(320, 90, '離岸流（沖へ速く流れる）', { size: 13, anchor: 'middle', fill: C.red })}
  ${diver(320, 170, { scale: 0.45, rot: -90 })}
  ${arrow(340, 170, 450, 170, C.teal, 4)}${t(372, 155, '① 岸と平行に泳ぐ', { size: 13, fill: C.teal })}
  ${arrow(470, 180, 440, 240, C.teal, 3)}${t(480, 215, '② 抜けたら岸へ', { size: 13, fill: C.teal })}
  ${t(24, 350, '流れに逆らってまっすぐ岸へ泳ぐと体力を使い果たす。無理なら浮いて合図する', { size: 12, weight: 400, fill: C.muted })}`, { h: 370 });

// 4-11 オーバーウエイト
figures['fig-4-11-overweight'] = card('ウエイトが重すぎると、かえって疲れる', `
  <rect x="24" y="60" width="286" height="240" rx="12" fill="#E3F4EF"/>${t(167, 90, '◎ 適正ウエイト', { size: 15, fill: C.teal, anchor: 'middle' })}
  ${diver(170, 190, { scale: 0.85 })}${t(167, 270, '水平の姿勢で、BCDの空気も少ない', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}
  <rect x="330" y="60" width="286" height="240" rx="12" fill="#FBE4DE"/>${t(473, 90, '× 重すぎる', { size: 15, fill: C.red, anchor: 'middle' })}
  ${diver(470, 190, { scale: 0.85, rot: 25 })}${arrow(440, 205, 440, 255, C.red)}${arrow(500, 150, 500, 110, C.amber)}
  ${t(473, 270, '足が沈み、BCDに空気を入れすぎて不安定に', { size: 12, weight: 400, fill: C.ink, anchor: 'middle' })}
  ${t(24, 335, '適正ウエイト：空気をほぼ抜いたBCDで、普通に息を吐いたとき目の高さで浮く程度', { size: 12, weight: 400, fill: C.muted })}`);

// 4-6 ウェットとドライ
figures['fig-4-6-suits'] = card('ウェットスーツとドライスーツの保温のしくみ', `
  <rect x="24" y="60" width="286" height="250" rx="12" fill="${C.mist}"/>${t(167, 90, 'ウェットスーツ', { size: 15, anchor: 'middle' })}
  <rect x="60" y="120" width="40" height="150" fill="#F2D4BD"/>${t(80, 290, '体', { size: 12, anchor: 'middle', fill: C.ink })}
  <rect x="100" y="120" width="26" height="150" fill="${C.tealLight}"/>${t(113, 306, '水', { size: 12, anchor: 'middle', fill: C.ink })}
  <rect x="126" y="120" width="60" height="150" fill="${C.navy}"/>${[140, 170, 200, 230, 255].map((y, i) => `<circle cx="${140 + (i % 2) * 22}" cy="${y}" r="5" fill="${C.sea}"/>`).join('')}
  ${t(156, 290, '生地（泡）', { size: 12, anchor: 'middle', fill: C.ink })}
  ${t(200, 160, '体温で温まった', { size: 12, weight: 400, fill: C.ink })}${t(200, 180, '薄い水の層と、', { size: 12, weight: 400, fill: C.ink })}${t(200, 200, '生地の泡で保温', { size: 12, weight: 400, fill: C.ink })}
  <rect x="330" y="60" width="286" height="250" rx="12" fill="${C.mist}"/>${t(473, 90, 'ドライスーツ', { size: 15, anchor: 'middle' })}
  <rect x="366" y="120" width="40" height="150" fill="#F2D4BD"/>${t(386, 290, '体', { size: 12, anchor: 'middle', fill: C.ink })}
  <rect x="406" y="120" width="40" height="150" fill="${C.sand}"/>${t(426, 306, 'インナー', { size: 12, anchor: 'middle', fill: C.ink })}
  <rect x="446" y="120" width="20" height="150" fill="${C.navy}"/>${t(456, 290, '生地', { size: 12, anchor: 'middle', fill: C.ink })}
  ${t(478, 160, '水が入らず、', { size: 12, weight: 400, fill: C.ink })}${t(478, 180, '空気の層と', { size: 12, weight: 400, fill: C.ink })}${t(478, 200, 'インナーで保温', { size: 12, weight: 400, fill: C.ink })}
  ${t(24, 340, 'ウェットスーツは潜ると泡がつぶれて薄くなり、保温力と浮力が下がる', { size: 12, weight: 400, fill: C.muted })}`);

// 3-11 その他のリスク（4つ）
figures['fig-3-11-risks'] = card('ダイビングで気をつけたい体の変化', (() => {
  const box = (x, y, title, sub, col) => `<rect x="${x}" y="${y}" width="282" height="118" rx="12" fill="${C.mist}"/><circle cx="${x + 36}" cy="${y + 40}" r="18" fill="${col}"/>
    ${t(x + 66, y + 46, title, { size: 15 })}${t(x + 20, y + 84, sub, { size: 12, weight: 400, fill: C.ink })}`;
  return box(24, 60, '体が冷える（低体温）', '震えや判断の遅れ → 早めに切り上げる', C.tealLight) + box(334, 60, '息が上がる（過呼吸）', '止まって、ゆっくり大きく吐く', C.amber) +
    box(24, 196, '脱水', '前後にこまめに水分補給する', C.teal) + box(334, 196, '船酔い', '前日の睡眠と、酔い止めの準備', C.red);
})());

const out = new URL('../../public/figures/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const [name, svg] of Object.entries(figures)) writeFileSync(new URL(`${name}.svg`, out), svg);
console.log(`${Object.keys(figures).length} figures written`);
