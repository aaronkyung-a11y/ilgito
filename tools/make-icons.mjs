// PWA 아이콘 생성: 먹빛 바탕 위 붉은 낙관에 붓글씨 "討" (게임 안의 격파 낙관과 같은 글자·글꼴)
// 사용: node tools/make-icons.mjs  → icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
// 글꼴(Yuji Boku)을 Google Fonts에서 받아 헤드리스 Chrome 캔버스로 그린다. Playwright·Chrome 경로는 작업 환경 기준.
import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setContent('<!DOCTYPE html><html><head><link href="https://fonts.googleapis.com/css2?family=Yuji+Boku&display=swap" rel="stylesheet"></head><body></body></html>');
const fontOk = await p.evaluate(async () => { try { await document.fonts.load('400 200px "Yuji Boku"', '討'); } catch (e) {} return document.fonts.check('400 200px "Yuji Boku"', '討'); });
if (!fontOk) { console.error('Yuji Boku 글꼴을 받지 못했다 — 아이콘을 만들지 않음'); await b.close(); process.exit(1); }
// mode: round = 둥근 모서리(투명), square = 꽉 찬 정사각, mask = 가운데 80% 안전 영역 안에 낙관
const png = (size, mode) => p.evaluate(({ size, mode }) => {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), S = size;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  if (mode === 'round') { rr(0, 0, S, S, S * 0.203); g.clip(); }
  const bg = g.createRadialGradient(S * 0.5, S * 0.42, S * 0.05, S * 0.5, S * 0.5, S * 0.78);
  bg.addColorStop(0, '#3a1f15'); bg.addColorStop(0.55, '#1a120d'); bg.addColorStop(1, '#0e0b09');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const s = S * (mode === 'mask' ? 0.56 : 0.7), x = (S - s) / 2, y = (S - s) / 2;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = S * 0.03; g.shadowOffsetY = S * 0.012;
  rr(x, y, s, s, s * 0.075); g.fillStyle = '#c8321e'; g.fill(); g.restore();
  const sg = g.createLinearGradient(0, y, 0, y + s); sg.addColorStop(0, 'rgba(255,170,130,0.22)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(60,0,0,0.3)');
  rr(x, y, s, s, s * 0.075); g.fillStyle = sg; g.fill();
  g.lineWidth = s * 0.02; g.strokeStyle = 'rgba(247,236,208,0.85)'; rr(x + s * 0.055, y + s * 0.055, s * 0.89, s * 0.89, s * 0.04); g.stroke();
  g.font = `400 ${s * 0.7}px "Yuji Boku"`; g.textBaseline = 'alphabetic';
  const m = g.measureText('討');
  g.fillStyle = '#f7ecd0';
  g.fillText('討', S / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, S / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  return c.toDataURL('image/png').split(',')[1];
}, { size, mode });
mkdirSync('icons', { recursive: true });
for (const [file, size, mode] of [['icon-192.png', 192, 'round'], ['icon-512.png', 512, 'round'], ['icon-maskable-512.png', 512, 'mask'], ['apple-touch-icon.png', 180, 'square']]) {
  writeFileSync('icons/' + file, Buffer.from(await png(size, mode), 'base64'));
}
await b.close();
console.log('icons written');
