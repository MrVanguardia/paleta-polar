// Pruebas automáticas de Paleta Polar (sin navegador).
// Uso: node tests/test.js
// 1. Valida los 20 mapas: tamaño, inicio, puerta, oleadas, portales y que todo sea alcanzable.
// 2. Juega cada nivel unos segundos con entradas al azar para detectar errores.
// 3. Comprueba la ida y vuelta del estado de red del multijugador.
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'web-src', 'game.html'), 'utf8');
let js = html.split('<script>')[1].split('</script>')[0];
const INIT = 'applySettings();loadLevel(0);S.live=false;showMenu();requestAnimationFrame(frame);';
if (!js.includes(INIT)) { console.error('No encuentro la línea de arranque del juego en game.html'); process.exit(1); }
js = js.replace(INIT, INIT + 'window.__t={get S(){return S},set S(v){S=v},loadLevel,start,update,render,encode,applySnap,NET,press,release,localAct,setNow:v=>now=v,LEVELS,ov,localPlayer};');

// --- entorno de navegador mínimo ---
function ctx2d() {
  return new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'canvas' ? {} : (...a) => ({ addColorStop() {} })),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}
const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
function el(id) {
  return {
    id, style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false, innerHTML: '', textContent: '', value: '',
    classList: classList(), addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {}, blur() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 300, right: 200, bottom: 300 }; },
    querySelector() { return el('q'); }, querySelectorAll() { return []; }, closest() { return null; },
    getContext() { return ctx2d(); }, setPointerCapture() {}, releasePointerCapture() {}, appendChild() {}, remove() {}, contains() { return false; },
    clientWidth: 900, clientHeight: 420, offsetWidth: 1, isConnected: true, width: 0, height: 0,
  };
}
const els = {};
global.window = global;
global.document = {
  getElementById: id => els[id] || (els[id] = el(id)), createElement: () => el('c'), querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, body: { classList: classList(), style: { setProperty() {} } }, documentElement: { style: { setProperty() {} }, classList: classList() },
  activeElement: null, hidden: false, fonts: { ready: Promise.resolve() },
};
global.getComputedStyle = () => ({ paddingLeft: '16', paddingRight: '16', paddingTop: '8', paddingBottom: '8', getPropertyValue: () => '' });
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.sessionStorage = global.localStorage;
global.requestAnimationFrame = () => {};
global.addEventListener = () => {};
global.devicePixelRatio = 2;
global.matchMedia = () => ({ matches: false, addEventListener() {} });
global.ResizeObserver = class { observe() {} };
global.screen = {};
Object.defineProperty(global, 'navigator', { value: { getGamepads: () => [] }, configurable: true });
Object.defineProperty(global, 'performance', { value: { now: () => 0 }, configurable: true });

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('  ✗ ' + msg); } };

eval(js);
const t = window.__t;

// --- 1. mapas ---
console.log('Mapas');
const WALL = new Set(['#', 'L']);
t.LEVELS.forEach((lv, i) => {
  const n = `nivel ${i + 1} (${lv.name})`;
  const m = lv.map;
  ok(m.length === 13, `${n}: tiene ${m.length} filas, deben ser 13`);
  m.forEach((r, y) => ok(r.length === 15, `${n}: la fila ${y} mide ${r.length}, debe medir 15`));
  const all = m.join('');
  const count = c => all.split(c).length - 1;
  ok(count('P') === 1, `${n}: debe tener exactamente un inicio P`);
  ok(count('X') === 1, `${n}: debe tener exactamente una puerta X`);
  ok(count('1') + count('a') > 0, `${n}: no tiene fruta de la oleada 1`);
  ok(count('T') % 2 === 0, `${n}: los portales T deben ir por parejas`);
  ok(typeof lv.par === 'number' && lv.par > 0, `${n}: falta el tiempo objetivo (par)`);
  // alcance desde P (el hielo se puede romper, la roca y la lava no)
  const portals = [];
  m.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'T') portals.push([x, y]); }));
  let start;
  m.forEach((r, y) => { const x = r.indexOf('P'); if (x >= 0) start = [x, y]; });
  const seen = new Set([start.join()]);
  const q = [start];
  while (q.length) {
    const [x, y] = q.shift();
    const next = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    const pi = portals.findIndex(p => p[0] === x && p[1] === y);
    if (pi >= 0) next.push(portals[pi ^ 1]);
    for (const [nx, ny] of next) {
      const c = m[ny] && m[ny][nx];
      if (!c || WALL.has(c) || seen.has(nx + ',' + ny)) continue;
      seen.add(nx + ',' + ny); q.push([nx, ny]);
    }
  }
  m.forEach((r, y) => [...r].forEach((c, x) => {
    if ('123abX'.includes(c)) ok(seen.has(x + ',' + y), `${n}: '${c}' en (${x},${y}) no se puede alcanzar desde el inicio`);
  }));
});

// --- 2. partidas simuladas ---
console.log('Partidas simuladas');
let now = 0;
const step = (ms = 16) => { now += ms; t.setNow(now); t.update(ms); t.render(); };
const dirs = ['up', 'down', 'left', 'right'];
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
t.LEVELS.forEach((lv, i) => {
  try {
    t.start(i); t.ov.hidden = true;
    for (let f = 0; f < 2400; f++) {
      if (f % 40 === 0) { t.release('k'); t.press('k', dirs[(rnd() * 4) | 0]); }
      if (f % 25 === 0) t.localAct();
      step();
      if (t.S.state === 'lost') { t.loadLevel(i); t.ov.hidden = true; }
    }
  } catch (e) { ok(false, `nivel ${i + 1}: error durante la partida: ${e.stack}`); }
});

// --- 3. red ---
console.log('Multijugador (estado de red)');
try {
  t.start(3); t.ov.hidden = true;
  for (let f = 0; f < 60; f++) step();
  const snap = JSON.parse(JSON.stringify(t.encode()));
  const bytes = JSON.stringify(snap).length;
  ok(bytes < 8000, `el estado de red pesa ${bytes} bytes; debería ser menor de 8000`);
  t.NET.mode = 'guest'; t.S = null; t.applySnap(snap);
  ok(t.S && t.S.li === 3, 'el invitado no reconstruye el nivel correcto');
  for (let f = 0; f < 60; f++) step();
  t.NET.mode = 'solo';
} catch (e) { ok(false, 'error en la ida y vuelta de red: ' + e.stack); }

if (fails) { console.log(`\n${fails} prueba(s) fallaron`); process.exit(1); }
console.log(`\nTodo bien: ${t.LEVELS.length} niveles validados y jugados.`);
process.exit(0);
