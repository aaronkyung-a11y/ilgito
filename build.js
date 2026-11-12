// template.html + src/*.js(이름순) → 단일 HTML
//   node build.js           dist/index.html (아티팩트·개발용: three.js는 cdnjs, PWA 태그 없음)
//   node build.js release   + versions/ilgito-v{버전}.html (스냅샷, dist와 같은 내용)
//                           + index.html (저장소 루트, GitHub Pages로 서비스되는 설치형 PWA 판: three.js는 vendor/)
//                           + sw.js (pwa/sw.js에 버전을 채운 것)
// 버전은 package.json의 version.
const fs = require('fs'), path = require('path');
const root = __dirname, at = (...p) => path.join(root, ...p);
const version = 'v' + require('./package.json').version, release = process.argv[2] === 'release';
const PAGES_URL = 'https://aaronkyung-a11y.github.io/ilgito/';
const files = fs.readdirSync(at('src')).filter((f) => f.endsWith('.js')).sort();
let js = "(function(){\n'use strict';\nif(!window.THREE){var f=document.getElementById('fatal');f.textContent='3D 엔진(three.js)을 불러오지 못했습니다. 네트워크를 확인한 뒤 다시 열어 주세요.';f.classList.remove('hidden');return;}\n";
for (const f of files) js += fs.readFileSync(at('src', f), 'utf8') + '\n';
js += '})();';
const tpl = fs.readFileSync(at('template.html'), 'utf8');
const marker = '<!--__PWA__-->\n', cdn = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
for (const [name, needle] of [['PWA marker', marker], ['three.js url', cdn], ['version', '__VERSION__'], ['game js', '/*__GAME_JS__*/']]) if (tpl.split(needle).length !== 2) throw new Error('template: expected exactly one ' + name);
const full = tpl.replace('__VERSION__', () => version).replace('/*__GAME_JS__*/', () => js);
const html = full.replace(marker, () => '');
fs.mkdirSync(at('dist'), { recursive: true });
fs.writeFileSync(at('dist', 'index.html'), html);
fs.writeFileSync(at('dist', 'game.js'), js);
console.log('built', version, files.length, 'files,', (Buffer.byteLength(html) / 1024).toFixed(1), 'KB');
if (release) {
  const fill = (s) => s.split('__VERSION__').join(version).split('__PAGES_URL__').join(PAGES_URL);
  fs.mkdirSync(at('versions'), { recursive: true });
  fs.writeFileSync(at('versions', `ilgito-${version}.html`), html);
  const pwa = full.replace(marker, () => fill(fs.readFileSync(at('pwa', 'head.html'), 'utf8'))).replace(cdn, () => 'vendor/three.min.js');
  fs.writeFileSync(at('index.html'), pwa);
  fs.writeFileSync(at('sw.js'), fill(fs.readFileSync(at('pwa', 'sw.js'), 'utf8')));
  console.log('release', version, '→ versions/ilgito-' + version + '.html, index.html (PWA,', (Buffer.byteLength(pwa) / 1024).toFixed(1), 'KB), sw.js');
}
