// ───────────────────────── data: palettes, armies, heroes, stages ─────────────────────────
const PALS = {
  dusk: { top: 0x1b1f3a, mid: 0x7a3b3b, hor: 0xf0a35a, sun: 0xffb46b, sunCore: 0xfff3d6, sunDir: [0.35, 0.13, -1], sunSize: 0.9965, cloud: 0.75, cloudDark: 0x3a2030, cloudLit: 0xffa560,
    fog: 0xd6935f, fogNear: 35, fogFar: 480, ground: 0x9a7350, hemiSky: 0xffc9a0, hemiGround: 0x4a3528, hemiI: 0.85, sunLight: 0xffb070, sunI: 0.9, fill: 0x8fa4c8, fillI: 0.4,
    tLit: 0xfff1de, tShade: 0x8d7cae, tRim: 0xffd49c, ink: 0x2a1820, tExp: 1.12,
    ridge: 0x3b2a3a, mote: { color: [1, 0.85, 0.6], add: false, a: 0.35, size: 0.045, rise: 0.05 } },
  noon: { top: 0x5f86ad, mid: 0xbfc6b6, hor: 0xe9dcae, sun: 0xfff2c8, sunCore: 0xffffff, sunDir: [-0.3, 0.75, -0.6], sunSize: 0.9985, cloud: 0.4, cloudDark: 0x9aa3a6, cloudLit: 0xffffff,
    fog: 0xddd0a2, fogNear: 40, fogFar: 520, ground: 0xb79a62, hemiSky: 0xfff6dc, hemiGround: 0x6a5a3c, hemiI: 0.74, sunLight: 0xfff0cc, sunI: 0.72, fill: 0xb8c4d8, fillI: 0.16,
    tLit: 0xfffdf2, tShade: 0x929fbe, tRim: 0xffffff, ink: 0x241d1a, tExp: 1.1,
    ridge: 0x6f7a78, mote: { color: [1, 0.95, 0.75], add: false, a: 0.4, size: 0.05, rise: 0.02 } },
  mist: { top: 0x2b3848, mid: 0x62748a, hor: 0xa9b5bf, sun: 0xcfe0ee, sunCore: 0xf2f8ff, sunDir: [0.5, 0.1, -0.85], sunSize: 0.998, cloud: 0.9, cloudDark: 0x39434f, cloudLit: 0xc4d2de,
    fog: 0x9eabb6, fogNear: 18, fogFar: 270, ground: 0x717868, hemiSky: 0xc7d6e6, hemiGround: 0x3c4238, hemiI: 0.95, sunLight: 0xd6e4f2, sunI: 0.5, fill: 0xaab8cc, fillI: 0.3,
    tLit: 0xf0f5fa, tShade: 0x8c9aae, tRim: 0xeaf4ff, ink: 0x1e2228, tExp: 1.08,
    ridge: 0x4a5663, mote: { color: [0.9, 0.95, 1], add: false, a: 0.3, size: 0.07, rise: 0 } },
  fire: { top: 0x05060d, mid: 0x24121c, hor: 0xff7a2a, sun: 0xff5a14, sunCore: 0xffc070, sunDir: [-0.2, 0.02, -1], sunSize: 1.1, cloud: 0.85, cloudDark: 0x100a0e, cloudLit: 0xff6a20,
    fog: 0x5a2a18, fogNear: 20, fogFar: 300, ground: 0x4a3226, hemiSky: 0xff9a5a, hemiGround: 0x1a1210, hemiI: 0.55, sunLight: 0xff7a30, sunI: 1.05, fill: 0x6a7fb0, fillI: 0.45,
    tLit: 0xffe2c0, tShade: 0x5e4c74, tRim: 0xff9a48, ink: 0x160c0e, tExp: 1.12,
    ridge: 0x120c10, mote: { color: [1, 0.55, 0.15], add: true, a: 0.9, size: 0.035, rise: 1.6 } },
  blood: { top: 0x140a14, mid: 0x5c1622, hor: 0xe2482c, sun: 0xff4a2a, sunCore: 0xffd0a0, sunDir: [0.0, 0.1, -1], sunSize: 0.992, cloud: 0.8, cloudDark: 0x1c0c14, cloudLit: 0xff5a30,
    fog: 0x8a3024, fogNear: 30, fogFar: 420, ground: 0x6a4038, hemiSky: 0xff8a70, hemiGround: 0x2a1414, hemiI: 0.7, sunLight: 0xff6a40, sunI: 1.0, fill: 0x8090c0, fillI: 0.48,
    tLit: 0xffeee2, tShade: 0x66507e, tRim: 0xff8a5a, ink: 0x1c0a10, tExp: 1.1,
    ridge: 0x1a0a12, mote: { color: [1, 0.4, 0.15], add: true, a: 0.8, size: 0.03, rise: 0.9 } },
};
const ARMY = {
  ally: { color: 0x3f7a55, dark: 0x244a34, flag: '#2f6b48', ink: '#f3e7c4', ch: '劉' },
  dong: { color: 0x4b3a5e, dark: 0x221a2c, flag: '#241b2e', ink: '#d9c38a', ch: '董' },
  yuan: { color: 0xb08a2e, dark: 0x6a4f14, flag: '#c79a2c', ink: '#231a10', ch: '袁' },
  cao: { color: 0x2f4f86, dark: 0x18294a, flag: '#23407a', ink: '#e9e2cc', ch: '曹' },
  lu: { color: 0x7a1c1c, dark: 0x2a0a0a, flag: '#161012', ink: '#d83a22', ch: '呂' },
};
const HEROES = [
  { id: 'guanyu', hj: '關羽', kr: '관우', weapon: 'glaive', wname: '청룡언월도', trait: '일격이 무겁다', atk: 1.25, hp: 100, parry: 1.0, ki: 1.0,
    superHj: '青龍偃月', superKr: '청룡언월참', trail: 0x7fe0b0, rgb: '127,224,176', sleeve: 0x2f6b48, bracer: 0x8a7a4a,
    horse: { coat: 0x7a3a22, mane: 0x1a1210, cloth: 0x2f6b48 }, weaponOpt: { shaft: 0x1f3a2c } },
  { id: 'zhangfei', hj: '張飛', kr: '장비', weapon: 'serpent', wname: '장팔사모', trait: '맷집이 세고 기세가 빨리 찬다', atk: 1.08, hp: 130, parry: 1.0, ki: 1.35,
    superHj: '燕人咆哮', superKr: '연인포효', trail: 0xff7a50, rgb: '255,122,80', sleeve: 0x2a2622, bracer: 0x5a2a20,
    horse: { coat: 0x1c1816, mane: 0x0c0a09, cloth: 0x7a2a1c }, weaponOpt: { shaft: 0x241a16 } },
  { id: 'zhaoyun', hj: '趙雲', kr: '조운', weapon: 'spear', wname: '애각창', trait: '쳐내는 순간이 넉넉하다', atk: 1.0, hp: 100, parry: 1.3, ki: 1.1,
    superHj: '七探蛇盤', superKr: '칠탐사반창', trail: 0xa8d8ff, rgb: '168,216,255', sleeve: 0xdfe5ea, bracer: 0x9aa7b4,
    horse: { coat: 0xe6e0d4, mane: 0xc9c2b4, cloth: 0x3a5a8a }, weaponOpt: { shaft: 0x8a8f96 } },
];
// attack tokens: L R U D (the swipe that parries it) + ! heavy(guard 불가) ~ delayed ' quick >X feint into X
const STAGES = [
  { id: 'huaxiong', hj: '華雄', kr: '화웅', ttl: '동탁군 효기교위', place: '汜水關', placeKr: '사수관', pal: 'dusk', army: 'dong',
    quote: '내 칼 아래 이름 없는 귀신이 되어라!', weapon: 'glaive', scale: 1.0,
    look: { armor: 0x4a3f5c, armor2: 0x231f2b, cloth: 0x2c2436, sash: 0x7a2a5a, cape: 0x3b2a4f, plume: 0xc8321e, helm: 'plume', beard: 1 },
    horse: { coat: 0x3a2a20, mane: 0x120e0c, cloth: 0x4b3a5e },
    ai: { hp: 480, dmg: 10, wind: 0.95, windNext: 0.75, idle: [1.2, 2.1], recover: 0.8, postDecay: 6, counterAfter: [3, 4], chargeWind: 1.15,
      strings: [['L'], ['R'], ['U'], ['L', 'R'], ['R', 'L'], ['U', 'L']],
      rage: { at: 0.4, windMul: 0.92, strings: [['L', 'R'], ['R', 'L', 'U'], ['U!'], ['L', 'U']] } } },
  { id: 'yanliang', hj: '顔良', kr: '안량', ttl: '원소군 상장', place: '白馬', placeKr: '백마', pal: 'noon', army: 'yuan',
    quote: '하북의 안량이 여기 있다. 덤벼라!', weapon: 'glaive', scale: 1.03,
    look: { armor: 0xa37f26, armor2: 0x5a3c1c, cloth: 0x6a4a1c, sash: 0x8a2a1c, cape: 0xb08a2a, plume: 0xf2ead8, helm: 'plume', beard: 1 },
    horse: { coat: 0x8a4a22, mane: 0x2a1a10, cloth: 0xc79a2c },
    ai: { hp: 600, dmg: 12, wind: 0.86, windNext: 0.67, idle: [1.0, 1.8], recover: 0.75, postDecay: 7, counterAfter: [3, 4], chargeWind: 1.0,
      strings: [['L', 'R'], ['R', 'L', 'U'], ['U', 'U'], ['L', 'L', 'R'], ['D'], ['U!'], ['R', 'D']],
      rage: { at: 0.4, windMul: 0.9, strings: [['L', 'R', 'L'], ['U', 'D', 'U'], ['L!'], ['R', 'L', 'U!'], ['D', 'D']] } } },
  { id: 'wenchou', hj: '文醜', kr: '문추', ttl: '원소군 상장', place: '延津', placeKr: '연진', pal: 'mist', army: 'yuan',
    quote: '안량의 원수, 이 창으로 갚아 주마!', weapon: 'spear', scale: 1.03,
    look: { armor: 0x5a5a3a, armor2: 0x2a2a1e, cloth: 0x3a3a26, sash: 0xc79a2c, cape: 0x8a7a2a, plume: 0xc79a2c, helm: 'horn', beard: 0 },
    horse: { coat: 0x1e1a18, mane: 0x0a0908, cloth: 0xc79a2c },
    ai: { hp: 700, dmg: 12, wind: 0.78, windNext: 0.59, idle: [0.9, 1.6], recover: 0.7, postDecay: 8, counterAfter: [2, 4], chargeWind: 1.0,
      strings: [['D', 'D'], ['D', 'L', 'D'], ['R', 'D', 'D'], ['L', 'R', 'D'], ['D~', "D'"], ['D!'], ['U', 'D']],
      rage: { at: 0.45, windMul: 0.9, strings: [['D', 'D', 'D'], ['L', 'D', 'R', 'D'], ['D!', "D'"], ['D~', "D'", "D'"], ['U', 'D', 'L!']] } } },
  { id: 'xiahoudun', hj: '夏侯惇', kr: '하후돈', ttl: '조조군 맹장', place: '博望坡', placeKr: '박망파', pal: 'fire', army: 'cao',
    quote: '눈 하나쯤 잃어도 네 목은 똑똑히 보인다.', weapon: 'spear', scale: 1.06,
    look: { armor: 0x2f4f86, armor2: 0x1a2438, cloth: 0x1e2a44, sash: 0xd2a850, cape: 0x1f3a70, plume: 0xdfe8f5, helm: 'plume', beard: 1, patch: true },
    horse: { coat: 0x8f8a84, mane: 0x3a3836, cloth: 0x23407a, barding: true, bardMetal: 0x4a5266, caparison: true },
    ai: { hp: 820, dmg: 15, wind: 0.72, windNext: 0.55, idle: [0.8, 1.5], recover: 0.65, postDecay: 9, counterAfter: [2, 3], chargeWind: 0.95,
      strings: [['L', 'R', 'L'], ['U', 'D', 'U'], ['L>R'], ['R>L', 'D'], ['D', 'D', 'U!'], ['L!'], ['R~', "L'", "R'"]],
      rage: { at: 0.45, windMul: 0.88, strings: [['L', 'R', 'L', 'R'], ['L>R', 'R>L'], ['U!', "D'"], ['D', 'D', 'L>U'], ['R!~'], ['U', 'L', 'D', 'R']] } } },
  { id: 'lubu', hj: '呂布', kr: '여포', ttl: '비장(飛將) · 천하무쌍', place: '虎牢關', placeKr: '호뢰관', pal: 'blood', army: 'lu',
    quote: '감히 이 여봉선 앞에 서겠다는 것이냐.', weapon: 'halberd', scale: 1.12,
    look: { armor: 0x8a1c1c, armor2: 0x1a1214, cloth: 0x2a1214, sash: 0xd2a850, cape: 0xa01818, plume: 0xe2c9a0, helm: 'crown', beard: 0 },
    horse: { coat: 0x8a2a1c, mane: 0x1a0c0a, cloth: 0x161012, caparison: false, tassel: 0xd2a850 },
    ai: { hp: 1150, dmg: 18, wind: 0.66, windNext: 0.5, idle: [0.6, 1.2], recover: 0.58, postDecay: 11, counterAfter: [2, 3], chargeWind: 0.9,
      strings: [['L', 'R', 'U', 'D'], ['L>R', 'R>L'], ['U', 'U', 'D', 'L!'], ["D'", "D'", "D'"], ['R!~'], ['L', 'R', 'L', 'R', 'U!'], ['U>D', 'L>U']],
      rage: { at: 0.5, windMul: 0.86, strings: [['L', 'R', 'U', 'D', 'L'], ['L>R', 'R>L', 'U>D'], ['U!', 'L!'], ["D'", "D'", "D'", 'U!'], ['R>L', 'L>R', 'D', 'D'], ['L!~', "R'", "L'"]] } } },
];
function parseAtk(tok) {
  const a = { dir: tok[0], heavy: false, mul: 1, feint: null };
  for (let i = 1; i < tok.length; i++) {
    const c = tok[i];
    if (c === '!') a.heavy = true; else if (c === '~') a.mul = 1.55; else if (c === "'") a.mul = 0.72; else if (c === '>') { a.feint = tok[i + 1]; i++; }
  }
  return a;
}
const NUM_HJ = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function hjNum(n) { if (n <= 10) return NUM_HJ[n]; if (n < 20) return '十' + NUM_HJ[n - 10]; if (n < 100) return NUM_HJ[(n / 10) | 0] + '十' + (n % 10 ? NUM_HJ[n % 10] : ''); return String(n); }
