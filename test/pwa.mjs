// 설치형(PWA) 판 점검. 저장소 루트의 index.html·sw.js·manifest·icons·vendor를 임시 폴더에 복사해
// GitHub Pages처럼(Cache-Control: max-age=600, ETag, 304) 서비스하면서 확인한다. 요청 가로채기는 쓰지 않는다.
//   node test/pwa.mjs
// 확인하는 것: 서비스 워커 등록·캐시, 매니페스트·아이콘 크기, 오프라인 실행, 옛 스냅샷 페이지 통과,
//             새 판 배포 직후(HTTP 캐시가 아직 신선할 때) 다시 열면 바로 새 판, 캐시본으로 연 화면의 "새 버전 적용" 단추, iOS 안내
import { createRequire } from 'module';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const ROOT = new URL('..', import.meta.url).pathname;
const site = mkdtempSync(join(tmpdir(), 'ilgito-pwa-')), dir = join(site, 'ilgito');
for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', 'icons', 'vendor', 'versions']) cpSync(join(ROOT, f), join(dir, f), { recursive: true });
const cur = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const deploy = (ver) => { for (const f of ['index.html', 'sw.js']) writeFileSync(join(dir, f), readFileSync(join(ROOT, f), 'utf8').split('v' + cur).join(ver)); };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const state = { down: false, hits: [] };
const server = createServer((req, res) => {
  if (state.down) { req.socket.destroy(); return; }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(site, p));
  if (!file.startsWith(site) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  const body = readFileSync(file), etag = '"' + createHash('md5').update(body).digest('hex') + '"';
  state.hits.push(p);
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': 'max-age=600' }); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: etag });
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/ilgito/`;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [], out = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
const ok = (name, cond, extra) => { out.push((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) errors.push('FAIL ' + name); };
const open = async (url = base) => { await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction('window.__ilgito && window.__ilgito.G.mode === "title"', null, { timeout: 20000 }); };
const ver = () => page.evaluate(() => document.getElementById('ver').textContent);
const swInfo = () => page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
  const keys = await caches.keys(), name = keys.find((k) => /^ilgito-v/.test(k)), c = await caches.open(name);
  const fonts = keys.includes('ilgito-fonts') ? (await (await caches.open('ilgito-fonts')).keys()).length : 0;
  const v = await new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = (e) => r(e.data.v); navigator.serviceWorker.controller.postMessage({ type: 'ilgito-ver' }, [ch.port2]); setTimeout(() => r('none'), 3000); });
  return { keys, urls: (await c.keys()).map((r) => new URL(r.url).pathname.replace('/ilgito/', '') || './'), fonts, swVer: v };
});
try {
  // 1. 첫 방문
  await open();
  let s = await swInfo();
  ok('첫 방문: 서비스 워커가 화면을 넘겨받음', s.swVer === 'v' + cur, 'sw=' + s.swVer);
  ok('캐시에 7개 항목', s.urls.length === 7, s.urls.join(' '));
  ok('화면 버전 표시', (await ver()) === 'v' + cur);
  ok('three.js를 같은 주소(vendor/)에서 불러옴', await page.evaluate(() => !!window.THREE && document.querySelector('script[src="vendor/three.min.js"]') !== null));
  // 2. 매니페스트·아이콘
  const man = await page.evaluate(async () => {
    const m = await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
    const icons = await Promise.all(m.icons.map((i) => new Promise((r) => { const im = new Image(); im.onload = () => r(i.sizes + '=' + im.naturalWidth + 'x' + im.naturalHeight + '/' + i.purpose); im.onerror = () => r(i.sizes + '=ERR'); im.src = new URL(i.src, document.querySelector('link[rel=manifest]').href); })));
    const apple = await new Promise((r) => { const im = new Image(); im.onload = () => r(im.naturalWidth + 'x' + im.naturalHeight); im.onerror = () => r('ERR'); im.src = document.querySelector('link[rel=apple-touch-icon]').href; });
    return { name: m.name, short: m.short_name, display: m.display, start: m.start_url, icons, apple };
  });
  ok('매니페스트', man.name === '삼국지 일기토' && man.display === 'fullscreen' && man.start === './', JSON.stringify(man));
  ok('아이콘 크기', man.icons.join(' ') === '192x192=192x192/any 512x512=512x512/any 512x512=512x512/maskable' && man.apple === '180x180');
  ok('설치·업데이트 단추는 평소에 숨김', await page.evaluate(() => ['btnInstall', 'btnUpdate', 'iosHint'].every((id) => document.getElementById(id).classList.contains('hidden'))));
  // 3. 두 번째 방문부터 글꼴이 서비스 워커 캐시에 들어감
  await open();
  await page.waitForTimeout(1500);
  s = await swInfo();
  ok('두 번째 방문: 글꼴 캐시', s.fonts > 0, 'entries=' + s.fonts);
  // 4. 오프라인(서버 내림 + 브라우저 오프라인)
  state.down = true; await ctx.setOffline(true);
  await open();
  ok('오프라인에서 실행', (await ver()) === 'v' + cur && await page.evaluate(() => !!window.THREE && document.getElementById('fatal').classList.contains('hidden')));
  ok('오프라인에서 붓글씨 글꼴', await page.evaluate(() => document.fonts.ready.then(() => document.fonts.check('30px "Yuji Boku"', '討'))));
  state.down = false; await ctx.setOffline(false);
  // 5. 옛 스냅샷 페이지는 서비스 워커가 가로채지 않음
  await page.goto(base + 'versions/ilgito-v0.1.html', { waitUntil: 'load' });
  ok('versions/ 스냅샷은 그대로 열림', await page.evaluate(() => !document.getElementById('ver') && /v0\.1/.test(document.querySelector('.kills-wrap').textContent)));
  // 6. 새 판 배포 직후(HTTP 캐시가 아직 신선) 다시 열기 → 바로 새 판
  deploy('v9.9.1');
  await open();
  ok('배포 직후 다시 열면 바로 새 판', (await ver()) === 'v9.9.1', 'ver=' + (await ver()));
  // 참고: 화면이 계속 그려지는 동안 Chrome은 서비스 워커 교체를 1~2분 미룬다(업데이트 확인 지연 + 옛 워커가 한가해질 때까지 대기)
  const t6 = Date.now();
  while (Date.now() - t6 < 170000) {     // (waitForFunction은 Promise를 참으로 보고 바로 끝나므로 직접 되풀이해 확인한다)
    if (await page.evaluate(() => caches.keys().then((k) => k.includes('ilgito-v9.9.1') && !k.some((x) => /^ilgito-v/.test(x) && x !== 'ilgito-v9.9.1')))) break;
    await page.waitForTimeout(2000);
  }
  const waited = ((Date.now() - t6) / 1000).toFixed(0);
  s = await swInfo();
  ok('서비스 워커도 새 판으로, 옛 캐시 삭제', s.swVer === 'v9.9.1' && s.keys.filter((k) => /^ilgito-v/.test(k)).join() === 'ilgito-v9.9.1', s.keys.join(' ') + ' sw=' + s.swVer + ' (' + waited + '초 뒤)');
  ok('이때 "새 버전 적용" 단추는 안 뜸', await page.evaluate(() => document.getElementById('btnUpdate').classList.contains('hidden')));
  // 7. 캐시본으로 연 화면(오프라인) → 온라인 복귀 → 새 서비스 워커 → "새 버전 적용" 단추 → 누르면 새 판
  deploy('v9.9.2');
  state.down = true; await ctx.setOffline(true);
  await open();
  ok('오프라인에서는 캐시본(옛 판)', (await ver()) === 'v9.9.1');
  state.down = false; await ctx.setOffline(false);
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  await page.waitForFunction(() => !document.getElementById('btnUpdate').classList.contains('hidden'), null, { timeout: 90000 }).catch(() => {});
  ok('온라인 복귀 뒤 "새 버전 적용" 단추가 뜸', await page.evaluate(() => !document.getElementById('btnUpdate').classList.contains('hidden')));
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('#btnUpdate')]);
  await page.waitForFunction('window.__ilgito && window.__ilgito.G.mode === "title"', null, { timeout: 20000 });
  ok('단추를 누르면 새 판', (await ver()) === 'v9.9.2', 'ver=' + (await ver()));
  // 8. iOS Safari 안내
  const ios = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const ip = await ios.newPage();
  await ip.goto(base, { waitUntil: 'load' });
  ok('iOS에서는 "홈 화면에 추가" 안내', await ip.evaluate(() => !document.getElementById('iosHint').classList.contains('hidden') && document.getElementById('btnInstall').classList.contains('hidden')));
  await ip.screenshot({ path: join(ROOT, 'shots', 'pwa_ios_title.png') });
  await ios.close();
} catch (e) { errors.push('SCENARIO ' + e.message.split('\n')[0]); }
console.log(out.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close(); server.close(); rmSync(site, { recursive: true, force: true });
process.exit(errors.length ? 1 : 0);
