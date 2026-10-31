// 화면과 라우팅. 모든 링크는 해시 경로이며 사이트 밖으로 나가지 않는다
const E = SimEngine;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const link = p => '#' + p;
const KEY = 'mock-exchange-v2';

// 기준가: 2026-10-31 원본 화면 값. 실시간 시세를 못 받거나 live가 없는 종목은 여기서 무작위로 움직인다
const SYMBOLS = {
  BTC: ['비트코인', 77380, 'crypto', 1], ETH: ['이더리움', 2248, 'crypto', 1], XRP: ['리플', 1.259, 'crypto', 1],
  SOL: ['솔라나', 150, 'crypto', 1], DOGE: ['도지코인', 0.15, 'meme', 1], ADA: ['카르다노', 0.5, 'crypto', 1],
  TRX: ['트론', 0.3, 'crypto', 1], AVAX: ['아발란체', 20, 'crypto', 1], LTC: ['라이트코인', 80, 'crypto', 1],
  ZEC: ['지캐시', 1283, 'crypto', 1], TAO: ['비트텐서', 239, 'crypto', 1], PEPE: ['페페', 0.00000497, 'meme', 1],
  MX: ['MX 토큰', 2, 'crypto'], XAU: ['금', 3885, 'tradfi'], USOIL: ['원유', 62, 'tradfi'], SILVER: ['은', 49.5, 'tradfi'],
  NVDA: ['엔비디아', 180, 'stock'], AAPL: ['애플', 260, 'stock'], TSLA: ['테슬라', 430, 'stock'], GOOGL: ['구글', 280, 'stock'], MSFT: ['마이크로소프트', 520, 'stock'],
  PREA: ['프리마켓 A (가상)', 0.5, 'pre'], PREB: ['프리마켓 B (가상)', 1.2, 'pre'], GEMX: ['밈 토큰 X (가상)', 0.002, 'meme'],
};
const STABLE = { USDT: 1, USDC: 1, USD1: 1, KRW: 1 / 1400 };
const ASSETS = () => ['USDT', 'USDC', 'USD1', 'KRW', ...Object.keys(SYMBOLS)];
const EARN = [
  { id: 'flex', name: '자유 예치', path: '/earn', apr: 0.05, asset: 'USDT' },
  { id: 'hold', name: '보유 수익', path: '/earn/auto-earn', apr: 0.03, asset: 'USDT' },
  { id: 'fut', name: '선물 언', path: '/earn/futures-auto-earn', apr: 0.2, asset: 'USDT' },
  { id: 'chain', name: '온체인 언', path: '/earn/on-chain-staking', apr: 0.04, asset: 'BTC' },
];
const TRADERS = [
  { id: 'a', name: '가상 트레이더 A (안정형)', drift: 0.00002, swing: 0.002 },
  { id: 'b', name: '가상 트레이더 B (균형형)', drift: 0.00001, swing: 0.006 },
  { id: 'c', name: '가상 트레이더 C (공격형)', drift: 0, swing: 0.015 },
];
const MERCHANTS = [['가상 판매자 A', 1402], ['가상 판매자 B', 1408], ['가상 판매자 C', 1415]];
const TASKS = [
  ['welcome', '모의 계정 시작', 100, s => true], ['firstSpot', '첫 현물 거래', 50, s => s.hist.some(h => h.type === '현물')],
  ['firstFut', '첫 선물 거래', 100, s => s.hist.some(h => h.type === '선물')], ['firstEarn', '첫 언 예치', 50, s => s.hist.some(h => h.type === '언')],
  ['vol', '누적 거래액 10,000 USDT', 200, s => s.vol >= 10000],
];

let state;
try { state = JSON.parse(localStorage.getItem(KEY)) || E.newState(); } catch { state = E.newState(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장 불가 환경에서는 메모리로만 동작 */ } };

const market = {};
for (const k in SYMBOLS) market[k] = { price: SYMBOLS[k][1], open: SYMBOLS[k][1] };
let feed = 'sim';
const prices = () => { const p = { ...STABLE }; for (const k in market) p[k] = market[k].price; return p; };
const px = s => market[s]?.price ?? STABLE[s];
const chg = s => (market[s].price / market[s].open - 1) * 100;

const fmtP = n => n == null || !Number.isFinite(n) ? '-' : n.toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 2 : n >= 1 ? 4 : 8 });
const fmt = (n, d = 4) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: d });
const signed = (n, suf = '') => `<span class="${n >= 0 ? 'up' : 'down'}">${n >= 0 ? '+' : ''}${fmt(n, 4)}${suf}</span>`;
const pct = s => `<span class="${chg(s) >= 0 ? 'up' : 'down'}">${chg(s) >= 0 ? '+' : ''}${chg(s).toFixed(2)}%</span>`;
const nameOf = s => SYMBOLS[s]?.[0] || s;

function toast(msg, bad) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.className = 'toast'; }, 2600);
}
function attempt(fn, ok) {
  try { fn(); save(); if (ok) toast(ok); refresh(); } catch (e) { toast(e.message, true); }
}

// 실시간 부분만 다시 그려 입력 중인 폼을 건드리지 않는다
let live = [];
const addLive = fn => { live.push(fn); fn(); };
function refresh() {
  live.forEach(fn => fn());
  $('equity').textContent = fmt(E.equity(state, prices()), 2);
  $('feed').textContent = feed === 'live' ? '실시간 시세 + 모의 체결' : '시뮬레이션 시세';
}
function liveHtml(el, fn) { addLive(() => { const n = el(); if (n) n.innerHTML = fn(); }); }
const liveId = (id, fn) => liveHtml(() => $(id), fn);

async function pollLive() {
  try {
    const syms = Object.keys(SYMBOLS).filter(k => SYMBOLS[k][3]);
    const q = encodeURIComponent(JSON.stringify(syms.map(k => k + 'USDT')));
    const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${q}`);
    if (!r.ok) throw new Error(r.status);
    for (const x of await r.json()) {
      const k = x.symbol.replace('USDT', '');
      market[k].price = Number(x.lastPrice);
      market[k].open = Number(x.openPrice);
    }
    feed = 'live';
  } catch { feed = 'sim'; }
}
function walkSim() {
  for (const k in market) {
    if (SYMBOLS[k][3] && feed === 'live') continue;
    market[k].price *= 1 + (Math.random() - 0.5) * 0.002;
  }
}
function pulse() {
  walkSim();
  attempt(() => E.tick(state, prices()));
}

const META = new Map();
for (const m of HEADER_MENUS) {
  if (m.path && !META.has(m.path.split('?')[0])) META.set(m.path.split('?')[0], [m.ko, m.en, m.desc]);
  for (const g of m.groups) for (const i of g.items) {
    const k = i[3].split('?')[0];
    if (!META.has(k)) META.set(k, [i[0], i[1], i[2]]);
  }
}
for (const c of FOOTER) for (const i of c.items.flatMap(x => x.sub || [x])) {
  const k = i[2].split('?')[0];
  if (!META.has(k)) META.set(k, [i[0], i[1], '']);
}
const titleOf = p => META.get(p) || ['모의 화면', '', ''];

function pageHead(path, extra = '') {
  const [ko, en, d] = titleOf(path);
  return `<h1 class="page-title">${esc(ko)}${en && en !== ko ? `<small>${esc(en)}</small>` : ''}</h1>${d ? `<p class="sec-desc">${esc(d)}</p>` : ''}${extra}`;
}
const opts = (list, sel) => list.map(a => `<option ${a === sel ? 'selected' : ''}>${a}</option>`).join('');
function onForm(id, fn, ok) {
  const f = $(id);
  if (f) f.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    attempt(() => fn(d, e.submitter?.value), typeof ok === 'function' ? null : ok);
  });
}
const balLine = a => `사용 가능 <b>${fmt(state.bal[a] || 0, 6)}</b> ${a}${state.bal[a] > 0 ? '' : ` · <a class="lnk" href="${link('/convert')}">USDT에서 교환</a>`}`;

function marketTable(list, base = '/exchange') {
  return `<div class="tw"><table><thead><tr><th>종목</th><th class="r">가격</th><th class="r">변동</th><th></th></tr></thead><tbody>${list.map(s =>
    `<tr><td><b>${s}</b> <span class="muted">${esc(nameOf(s))}</span></td><td class="r">${fmtP(px(s))}</td><td class="r">${pct(s)}</td><td class="r"><a class="mini" href="${link(`${base}/${s}_USDT`)}">거래</a></td></tr>`).join('')}</tbody></table></div>`;
}
const byCat = c => Object.keys(SYMBOLS).filter(k => SYMBOLS[k][2] === c);

/* ---------- 차트 ---------- */
const candles = {};
async function loadCandles(sym) {
  if (candles[sym]) return;
  candles[sym] = [];
  if (SYMBOLS[sym]?.[3]) {
    try {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}USDT&interval=1m&limit=90`);
      if (r.ok) { candles[sym] = (await r.json()).map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] })); return; }
    } catch { /* 아래 합성 캔들로 대체 */ }
  }
  let p = px(sym);
  const now = Math.floor(Date.now() / 60000) * 60000;
  for (let i = 90; i > 0; i--) {
    const c = p;
    const o = c * (1 + (Math.random() - 0.5) * 0.004);
    candles[sym].unshift({ t: now - i * 60000, o, c, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999 });
    p = o;
  }
}
function drawChart(canvas, sym) {
  if (!canvas || !candles[sym]?.length) return;
  const list = candles[sym];
  const price = px(sym);
  const bucket = Math.floor(Date.now() / 60000) * 60000;
  let last = list[list.length - 1];
  if (last.t < bucket) { last = { t: bucket, o: last.c, h: price, l: price, c: price }; list.push(last); if (list.length > 200) list.shift(); }
  last.c = price; last.h = Math.max(last.h, price); last.l = Math.min(last.l, price);
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio || 1;
  if (!w || !h) return;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);
  const show = list.slice(-Math.max(20, Math.floor((w - 70) / 7)));
  const hi = Math.max(...show.map(c => c.h)), lo = Math.min(...show.map(c => c.l));
  const y = v => 10 + (hi - v) / ((hi - lo) || 1) * (h - 24);
  const cw = (w - 70) / show.length;
  g.font = '11px sans-serif';
  for (let i = 0; i <= 4; i++) {
    const v = lo + (hi - lo) * i / 4;
    g.strokeStyle = '#1b1d23'; g.beginPath(); g.moveTo(0, y(v)); g.lineTo(w - 66, y(v)); g.stroke();
    g.fillStyle = '#7f8590'; g.fillText(fmtP(v), w - 62, y(v) + 4);
  }
  show.forEach((c, i) => {
    const x = i * cw + cw / 2;
    g.strokeStyle = g.fillStyle = c.c >= c.o ? '#2ebd85' : '#f6465d';
    g.beginPath(); g.moveTo(x, y(c.h)); g.lineTo(x, y(c.l)); g.stroke();
    g.fillRect(x - cw * 0.35, Math.min(y(c.o), y(c.c)), cw * 0.7, Math.max(1, Math.abs(y(c.o) - y(c.c))));
  });
  g.strokeStyle = '#3378ff'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, y(price)); g.lineTo(w - 66, y(price)); g.stroke(); g.setLineDash([]);
}
function chartBlock(sym) {
  loadCandles(sym).then(refresh);
  addLive(() => drawChart($('chart'), sym));
  return '<div class="panel chart-wrap"><canvas id="chart" aria-label="가격 차트"></canvas></div>';
}
function bookHtml(sym) {
  const p = px(sym);
  const row = (x, side, i) => `<div class="book-row ${side}"><span>${fmtP(x)}</span><span>${fmt(((Math.sin(x * 97 + i) + 1.2) * 3), 3)}</span></div>`;
  const asks = Array.from({ length: 8 }, (_, i) => row(p * (1 + 0.0004 * (8 - i)), 'down', i)).join('');
  const bids = Array.from({ length: 8 }, (_, i) => row(p * (1 - 0.0004 * (i + 1)), 'up', i)).join('');
  return `<div class="book-head"><span>가격</span><span>수량</span></div>${asks}<div class="book-mid">${fmtP(p)}</div>${bids}`;
}
function tradeTop(sym, label, sub) {
  liveId('t-top', () => `<b class="t-sym">${esc(label)}</b><span class="t-price">${fmtP(px(sym))}</span>${SYMBOLS[sym] ? pct(sym) : ''}<span class="muted">${esc(sub)}</span>`);
  return '<div class="t-top" id="t-top"></div>';
}

/* ---------- 현물 ---------- */
function viewSpot(el, pair) {
  const sym = pair.split('_')[0];
  if (!SYMBOLS[sym]) return viewInfo(el, '/exchange/' + pair);
  el.innerHTML = `${tradeTop(sym, `${sym}/USDT`, `${nameOf(sym)} · 모의 현물`)}
    <div class="t-grid">${chartBlock(sym)}
      <div class="panel" id="book"></div>
      <form class="panel form" id="spot">
        <div class="seg"><label><input type="radio" name="type" value="market" checked>시장가</label><label><input type="radio" name="type" value="limit">지정가</label></div>
        <label>지정가 (USDT)<input name="limit" inputmode="decimal" placeholder="지정가 주문에만 사용"></label>
        <label>수량 (${sym})<input name="qty" inputmode="decimal" required></label>
        <p class="muted" id="spot-bal"></p>
        <div class="two"><button class="btn up-bg" value="buy">매수</button><button class="btn down-bg" value="sell">매도</button></div>
      </form></div>
    <div class="panel"><h3>미체결 주문</h3><div id="orders"></div></div>`;
  liveId('book', () => bookHtml(sym));
  liveId('spot-bal', () => `${balLine('USDT')}<br>${balLine(sym)}`);
  liveId('orders', () => {
    const list = state.orders.filter(o => o.sym === sym);
    return list.length ? `<div class="tw"><table><tbody>${list.map(o => `<tr><td>${o.side === 'buy' ? '매수' : '매도'}</td><td>${fmt(o.qty, 6)} ${o.sym}</td><td class="r">지정가 ${fmtP(o.limit)}</td><td class="r"><button class="mini" data-do="cancel" data-id="${o.id}">취소</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">없음</p>';
  });
  onForm('spot', (d, side) => {
    if (d.type === 'limit') { E.placeLimit(state, sym, side, d.qty, d.limit); toast('지정가 주문을 접수했습니다'); }
    else { E.spotMarket(state, sym, side, d.qty, px(sym)); toast('시장가로 체결했습니다'); }
  });
}

/* ---------- 선물 ---------- */
function posTable(filter) {
  const list = state.pos.filter(filter);
  if (!list.length) return '<p class="muted">열린 포지션이 없습니다.</p>';
  return `<div class="tw"><table><thead><tr><th>종목</th><th class="r">진입가</th><th class="r">현재가</th><th class="r">강제 청산가</th><th class="r">손익</th><th></th></tr></thead><tbody>${list.map(p =>
    `<tr><td><b>${p.sym}</b> <span class="${p.side === 'long' ? 'up' : 'down'}">${p.side === 'long' ? '롱' : '숏'} ${p.lev}배</span></td><td class="r">${fmtP(p.entry)}</td><td class="r">${fmtP(px(p.sym))}</td><td class="r">${fmtP(p.liq)}</td><td class="r">${signed(E.posPnl(p, px(p.sym)), ' ' + p.settle)}</td><td class="r"><button class="mini" data-do="closepos" data-id="${p.id}">청산</button></td></tr>`).join('')}</tbody></table></div>`;
}
function viewFutures(el, pair, inverse, tabAi) {
  const [sym, q] = pair.split('_');
  if (!SYMBOLS[sym]) return viewInfo(el, '/futures/' + pair);
  const settle = inverse ? sym : q;
  el.innerHTML = `${tradeTop(sym, inverse ? `${sym}/USD 코인 마진` : `${sym}/${q} 무기한`, `${nameOf(sym)} · 모의 선물`)}
    ${tabAi ? '<div class="panel" id="ai"></div>' : ''}
    <div class="t-grid">${chartBlock(sym)}
      <div class="panel" id="book"></div>
      <form class="panel form" id="fut">
        <label>증거금 (${settle})<input name="margin" inputmode="decimal" required></label>
        <label>레버리지 <output id="levv">10배</output><input type="range" name="lev" min="1" max="200" value="10"></label>
        <div class="two"><label>익절가<input name="tp" inputmode="decimal" placeholder="선택"></label><label>손절가<input name="sl" inputmode="decimal" placeholder="선택"></label></div>
        <p class="muted" id="fut-bal"></p>
        <div class="two"><button class="btn up-bg" value="long">롱</button><button class="btn down-bg" value="short">숏</button></div>
      </form></div>
    <div class="panel"><h3>포지션</h3><div id="pos"></div></div>`;
  $('fut').lev.addEventListener('input', e => { $('levv').textContent = e.target.value + '배'; });
  liveId('book', () => bookHtml(sym));
  liveId('fut-bal', () => balLine(settle));
  liveId('pos', () => posTable(p => p.sym === sym));
  if (tabAi) liveId('ai', () => {
    const c = candles[sym] || [];
    if (c.length < 21) return '<p class="muted">데이터 수집 중</p>';
    const mean = n => c.slice(-n).reduce((a, x) => a + x.c, 0) / n;
    const up = mean(5) >= mean(20);
    return `<h3>AI 전략 (모의)</h3><p>5분 평균이 20분 평균보다 ${up ? '높아 <b class="up">상승 추세</b>' : '낮아 <b class="down">하락 추세</b>'}로 봅니다. 단순 이동평균 규칙으로 만든 연습용 문구이며 투자 조언이 아닙니다.</p>`;
  });
  onForm('fut', (d, side) => {
    E.openPos(state, { sym, side, margin: d.margin, lev: d.lev, price: px(sym), settle, inverse, tp: d.tp, sl: d.sl });
    toast('포지션을 열었습니다');
  });
}

/* ---------- 시장·목록 ---------- */
function viewMarkets(el, path) {
  const list = Object.keys(SYMBOLS);
  el.innerHTML = pageHead(path) + `<div class="panel"><div class="seg-tabs"><button class="on" data-m="/exchange">현물</button><button data-m="/futures">선물</button></div><div id="mk"></div></div>`;
  let base = '/exchange';
  el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
    base = b.dataset.m;
    el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
    refresh();
  }));
  liveId('mk', () => marketTable(list, base));
}
function viewList(el, path, list, base, note) {
  el.innerHTML = pageHead(path) + (note ? `<p class="note">${esc(note)}</p>` : '') + '<div class="panel" id="lst"></div>';
  liveId('lst', () => marketTable(list, base));
}

/* ---------- 구매 ---------- */
function viewBuy(el, path) {
  const isP2P = path.endsWith('p2p'), isCard = path.endsWith('mexc-card'), isFiat = path.endsWith('fiat-deposit');
  let body;
  if (isCard) {
    body = `<form class="panel form narrow" id="card"><h3>가상 카드 결제</h3><label>결제 금액 (USDT)<input name="amt" inputmode="decimal" required></label><p class="muted" id="b"></p><button class="btn">모의 결제</button><p class="muted">실제 카드 번호는 입력받지 않습니다.</p></form>`;
  } else if (isFiat) {
    body = `<form class="panel form narrow" id="fiat"><h3>가상 원화 충전</h3><label>금액 (KRW)<input name="amt" inputmode="numeric" required value="1000000"></label><p class="muted" id="b"></p><button class="btn">가상 충전</button></form>`;
  } else {
    body = `<form class="panel form narrow" id="buy"><h3>${isP2P ? 'P2P 모의 거래' : '원화로 사고팔기'}</h3>
      ${isP2P ? `<label>가상 판매자<select name="rate">${MERCHANTS.map(m => `<option value="${m[1]}">${m[0]} · 1 USDT = ${m[1].toLocaleString()}원</option>`).join('')}</select></label>` : ''}
      <label>코인<select name="asset">${opts(['USDT', 'BTC', 'ETH', 'XRP', 'SOL'], 'USDT')}</select></label>
      <label>금액 (KRW 또는 판매 수량)<input name="amt" inputmode="decimal" required></label><p class="muted" id="b"></p>
      <div class="two"><button class="btn up-bg" value="buy">구매</button><button class="btn down-bg" value="sell">판매</button></div></form>`;
  }
  el.innerHTML = pageHead(path) + body;
  liveId('b', () => `${balLine('KRW')}<br>${balLine('USDT')}`);
  onForm('card', d => { const a = Number(d.amt); if (!(a > 0)) throw new Error('금액을 입력하세요'); if (state.bal.USDT < a) throw new Error('USDT 잔고가 부족합니다'); state.bal.USDT -= a; state.hist.unshift({ t: Date.now(), type: '카드', text: `가상 카드 결제 ${a} USDT` }); }, '모의 결제를 마쳤습니다');
  onForm('fiat', d => E.deposit(state, 'KRW', d.amt), '가상 원화를 충전했습니다');
  onForm('buy', (d, side) => {
    const p = prices();
    if (d.rate) p.KRW = 1 / Number(d.rate);
    if (side === 'buy') E.convert(state, 'KRW', d.asset, d.amt, p);
    else E.convert(state, d.asset, 'KRW', d.amt, p);
    toast('모의 거래를 마쳤습니다');
  });
}
function viewConvert(el, path) {
  const list = ASSETS();
  el.innerHTML = pageHead(path) + `<form class="panel form narrow" id="cv">
    <label>보낼 자산<select name="from">${opts(list, 'USDT')}</select></label>
    <label>금액<input name="amt" inputmode="decimal" required></label>
    <label>받을 자산<select name="to">${opts(list, 'BTC')}</select></label>
    <p class="muted" id="cv-info"></p><button class="btn">수수료 0으로 교환</button></form>`;
  const f = $('cv');
  liveId('cv-info', () => { const a = Number(f.amt.value) || 0; return `${balLine(f.from.value)}<br>예상 수령 ${fmt(a * px(f.from.value) / px(f.to.value), 8)} ${f.to.value}`; });
  f.addEventListener('input', refresh);
  onForm('cv', d => E.convert(state, d.from, d.to, d.amt, prices()), '교환했습니다');
}

/* ---------- 언·대출 ---------- */
function viewEarn(el, path) {
  const list = EARN.filter(x => x.path === path || path === '/earn' || path === '/staking' || (path === '/futures-earn-staking' && x.id === 'fut'));
  el.innerHTML = pageHead(path) + `<div class="cards2">${list.map(x => `<form class="panel form" data-earn="${x.id}"><h3>${esc(x.name)}</h3><p class="big up">연 ${(x.apr * 100).toFixed(0)}%<small class="muted"> 모의 이율</small></p>
      <label>금액 (${x.asset})<input name="amt" inputmode="decimal" required></label><button class="btn">예치</button></form>`).join('')}</div>
    <div class="panel"><div class="row-between"><h3>내 예치</h3><button class="mini" data-do="advance">모의 시간 30일 앞당기기</button></div><div id="st"></div></div>`;
  el.querySelectorAll('[data-earn]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    attempt(() => E.stake(state, EARN.find(x => x.id === f.dataset.earn), f.amt.value, Date.now()), '예치했습니다');
  }));
  liveId('st', () => state.stakes.length ? `<div class="tw"><table><tbody>${state.stakes.map(x => `<tr><td>${esc(x.name)}</td><td class="r">${fmt(x.amt, 6)} ${x.asset}</td><td class="r up">이자 ${fmt(E.accrued(x.amt, x.apr, x.start, state, Date.now()), 6)}</td><td class="r"><button class="mini" data-do="redeem" data-id="${x.id}">해지</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">예치 내역이 없습니다.</p>');
}
function viewLoan(el, path) {
  el.innerHTML = pageHead(path) + `<form class="panel form narrow" id="ln">
    <label>담보 자산<select name="collateral">${opts(['BTC', 'USDT', 'USDC'], 'BTC')}</select></label>
    <label>담보 수량<input name="coll" inputmode="decimal" required></label>
    <label>빌릴 자산<select name="asset">${opts(['USDT', 'USDC', 'BTC'], 'USDT')}</select></label>
    <label>대출 금액<input name="amt" inputmode="decimal" required></label>
    <p class="muted">담보 가치의 50%까지, 연 12% 모의 금리</p><button class="btn">모의 대출</button></form>
    <div class="panel"><div class="row-between"><h3>내 대출</h3><button class="mini" data-do="advance">모의 시간 30일 앞당기기</button></div><div id="lo"></div></div>`;
  onForm('ln', d => E.borrow(state, { ...d, apr: 0.12 }, prices(), Date.now()), '대출받았습니다');
  liveId('lo', () => state.loans.length ? `<div class="tw"><table><tbody>${state.loans.map(x => `<tr><td>${fmt(x.amt, 6)} ${x.asset}</td><td>담보 ${fmt(x.coll, 6)} ${x.collateral}</td><td class="r down">이자 ${fmt(E.accrued(x.amt, x.apr, x.start, state, Date.now()), 6)}</td><td class="r"><button class="mini" data-do="repay" data-id="${x.id}">상환</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">대출 내역이 없습니다.</p>');
}

/* ---------- 봇·카피 ---------- */
function botRows(kind) {
  const list = state.bots.filter(b => b.kind === kind);
  if (!list.length) return '<p class="muted">실행 중인 항목이 없습니다.</p>';
  return `<div class="tw"><table><tbody>${list.map(b => {
    const v = E.botValue(b, prices());
    const info = kind === 'grid' ? `${b.sym} 평가 ${fmt(v, 2)} USDT · 실현 수익 ${signed(b.profit)}`
      : kind === 'dca' ? `${b.sym} 회당 ${fmt(b.amt, 2)} USDT · 누적 ${fmt(b.spent, 2)} USDT, ${fmt(b.bought, 8)} ${b.sym}`
      : `${esc(b.name)} · 평가 ${fmt(v, 2)} USDT · 손익 ${signed(v - b.invest)}`;
    return `<tr><td>${info}</td><td class="r"><button class="mini" data-do="stopbot" data-id="${b.id}">중지</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function viewGrid(el, path, sym) {
  if (!SYMBOLS[sym]) sym = 'BTC';
  el.innerHTML = pageHead(path) + `<form class="panel form narrow" id="gr">
    <label>종목<select name="sym">${opts(Object.keys(SYMBOLS), sym)}</select></label>
    <div class="two"><label>하단 가격<input name="low" inputmode="decimal" required></label><label>상단 가격<input name="high" inputmode="decimal" required></label></div>
    <div class="two"><label>칸 수<input name="n" inputmode="numeric" value="10" required></label><label>투자금 (USDT)<input name="invest" inputmode="decimal" required></label></div>
    <p class="muted" id="gr-p"></p><button class="btn">그리드 봇 시작</button></form>
    <div class="panel"><h3>실행 중</h3><div id="rows"></div></div>`;
  const f = $('gr');
  const fill = () => { const p = px(f.sym.value); f.low.value = +(p * 0.97).toPrecision(6); f.high.value = +(p * 1.03).toPrecision(6); };
  fill();
  f.sym.addEventListener('change', fill);
  liveId('gr-p', () => `현재가 ${fmtP(px(f.sym.value))} · ${balLine('USDT')}`);
  liveId('rows', () => botRows('grid'));
  onForm('gr', d => E.createGrid(state, { ...d, price: px(d.sym) }), '그리드 봇을 시작했습니다');
}
function viewDca(el, path) {
  el.innerHTML = pageHead(path) + `<form class="panel form narrow" id="dc">
    <label>종목<select name="sym">${opts(Object.keys(SYMBOLS), 'BTC')}</select></label>
    <label>회당 금액 (USDT)<input name="amt" inputmode="decimal" required></label>
    <label>매수 주기<select name="every"><option value="30000">30초 (연습용)</option><option value="60000">1분</option><option value="3600000">1시간</option></select></label>
    <button class="btn">DCA 시작</button></form><div class="panel"><h3>실행 중</h3><div id="rows"></div></div>`;
  liveId('rows', () => botRows('dca'));
  onForm('dc', d => E.createDca(state, { sym: d.sym, amt: d.amt, everyMs: d.every }, Date.now()), 'DCA를 시작했습니다');
}
function viewCopy(el, path) {
  el.innerHTML = pageHead(path) + `<p class="note">트레이더와 수익은 모두 가상이며 무작위로 움직입니다.</p><div class="cards2">${TRADERS.map(t => `<form class="panel form" data-tr="${t.id}"><h3>${esc(t.name)}</h3><label>금액 (USDT)<input name="amt" inputmode="decimal" required></label><button class="btn">팔로우</button></form>`).join('')}</div><div class="panel"><h3>팔로우 중</h3><div id="rows"></div></div>`;
  el.querySelectorAll('[data-tr]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    attempt(() => E.follow(state, TRADERS.find(x => x.id === f.dataset.tr), f.amt.value), '팔로우를 시작했습니다');
  }));
  liveId('rows', () => botRows('copy'));
}

/* ---------- 이벤트·보상 ---------- */
function viewEvent(el, path, amt = 20) {
  el.innerHTML = pageHead(path) + `<div class="panel narrow"><h3>모의 이벤트 참여</h3><p class="muted">조건 없이 가상 보상을 한 번 받을 수 있습니다. 원본 이벤트의 조건과 기간은 반영하지 않았습니다.</p><div id="ev"></div></div>`;
  liveId('ev', () => state.claimed[path] ? '<button class="btn" disabled>참여 완료</button>' : `<button class="btn" data-do="claim" data-id="${esc(path)}" data-amt="${amt}">가상 ${amt} USDT 받기</button>`);
}
function viewRewards(el, path) {
  el.innerHTML = pageHead(path) + '<div class="panel" id="tasks"></div>';
  liveId('tasks', () => `<div class="tw"><table><tbody>${TASKS.map(([id, name, amt, ok]) => {
    const done = state.claimed['task-' + id], ready = ok(state);
    return `<tr><td>${esc(name)}</td><td class="r up">${amt} USDT (가상)</td><td class="r">${done ? '<span class="muted">완료</span>' : ready ? `<button class="mini" data-do="claim" data-id="task-${id}" data-amt="${amt}">받기</button>` : '<span class="muted">조건 미달</span>'}</td></tr>`;
  }).join('')}</tbody></table></div>`);
}
function viewInvite(el, path) {
  el.innerHTML = pageHead(path) + `<div class="panel narrow"><h3>모의 초대</h3><p>초대 코드 <b>MOCK-${String(state.seq).padStart(4, '0')}</b></p><p class="muted">가상 친구를 초대하면 가상 보상을 받습니다. 실제로 전송되는 것은 없습니다.</p><div id="iv"></div></div>`;
  liveId('iv', () => {
    const n = Object.keys(state.claimed).filter(k => k.startsWith('invite-')).length;
    return `<p>초대한 가상 친구 <b>${n}</b>명 / 최대 5명</p>${n < 5 ? `<button class="btn" data-do="claim" data-id="invite-${n}" data-amt="140">가상 친구 초대 (+140 USDT)</button>` : ''}`;
  });
}
function viewScore(el, path) {
  el.innerHTML = pageHead(path) + '<div class="panel narrow" id="sc"></div>';
  liveId('sc', () => {
    const score = Math.floor(state.vol / 100);
    const tier = score >= 5000 ? 'VVIP 3' : score >= 1000 ? 'VVIP 2' : score >= 100 ? 'VVIP 1' : '일반';
    return `<p class="big">${score.toLocaleString()} 점</p><p>모의 등급 <b>${tier}</b></p><p class="muted">누적 모의 거래액 ${fmt(state.vol, 2)} USDT를 100으로 나눈 값입니다. 원본의 산정식이 아닙니다.</p>`;
  });
}

/* ---------- 자산 ---------- */
function viewAssets(el) {
  el.innerHTML = `<h1 class="page-title">내 모의 자산<small>Assets</small></h1>
    <div class="stats"><div class="stat"><b id="eq"></b><span>총 평가액 (USDT 환산)</span></div></div>
    <div class="cards2"><div class="panel"><h3>잔고</h3><div id="bals"></div></div>
    <form class="panel form" id="fa"><h3>가상 자금 충전</h3><label>자산<select name="asset">${opts(['USDT', 'USDC', 'USD1', 'KRW'], 'USDT')}</select></label><label>금액<input name="amt" inputmode="decimal" value="1000" required></label><button class="btn">충전</button><button type="button" class="btn ghost" data-do="reset">1억 USDT로 리셋</button></form></div>
    <div class="panel"><h3>열린 포지션</h3><div id="pos"></div></div>
    <div class="panel"><h3>거래 내역</h3><div id="hist"></div></div>`;
  liveId('eq', () => fmt(E.equity(state, prices()), 2));
  liveId('bals', () => `<div class="tw"><table><tbody>${Object.entries(state.bal).filter(([, v]) => v > 1e-12).map(([a, v]) => `<tr><td><b>${a}</b></td><td class="r">${fmt(v, 8)}</td><td class="r muted">≈ ${fmt(v * (px(a) || 0), 2)} USDT</td></tr>`).join('')}</tbody></table></div>`);
  liveId('pos', () => posTable(() => true));
  liveId('hist', () => state.hist.length ? `<div class="tw"><table><tbody>${state.hist.slice(0, 40).map(h => `<tr><td class="muted">${new Date(h.t).toLocaleTimeString('ko-KR')}</td><td>${esc(h.type)}</td><td>${esc(h.text)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">내역이 없습니다.</p>');
  onForm('fa', d => E.deposit(state, d.asset, d.amt), '가상 자금을 충전했습니다');
}

/* ---------- 도구·정보 ---------- */
function viewPrice(el, path, sym, quote) {
  if (quote) {
    el.innerHTML = pageHead(path) + `<form class="panel form narrow" id="cc"><label>코인<select name="sym">${opts(Object.keys(SYMBOLS), sym)}</select></label><label>수량<input name="amt" inputmode="decimal" value="1"></label><p class="big" id="cc-r"></p></form>`;
    const f = $('cc');
    liveId('cc-r', () => `${fmtP((Number(f.amt.value) || 0) * px(f.sym.value))} USD`);
    f.addEventListener('input', refresh);
    f.addEventListener('submit', e => e.preventDefault());
    return;
  }
  if (!sym) return viewList(el, path, Object.keys(SYMBOLS));
  if (!SYMBOLS[sym]) return viewInfo(el, path);
  el.innerHTML = `${tradeTop(sym, nameOf(sym), `${sym} 시세`)}${chartBlock(sym)}<div class="action-row"><a class="btn" href="${link(`/exchange/${sym}_USDT`)}">현물 거래</a><a class="btn ghost" href="${link(`/futures/${sym}_USDT`)}">선물 거래</a></div>`;
}
function viewHowTo(el, path, sym) {
  const s = SYMBOLS[sym] ? sym : 'BTC';
  el.innerHTML = pageHead(path) + `<div class="panel"><ol class="steps">
    <li>왼쪽 위 <b>내 모의 자산</b>에서 가상 자금을 확인합니다. <a class="lnk" href="${link('/assets')}">자산 보기</a></li>
    <li>원화로 시작하려면 <a class="lnk" href="${link('/buy-crypto')}">코인 구매</a>에서 USDT를 삽니다.</li>
    <li><a class="lnk" href="${link(`/exchange/${s}_USDT`)}">${s}/USDT 현물</a>에서 수량을 넣고 매수합니다.</li></ol></div>`;
}
function viewTax(el, path) {
  el.innerHTML = pageHead(path) + `<form class="panel form narrow" id="tx"><label>판매 금액<input name="sell" inputmode="decimal" value="1000"></label><label>취득 원가<input name="cost" inputmode="decimal" value="800"></label><label>세율 (%)<input name="rate" inputmode="decimal" value="20"></label><p class="big" id="tx-r"></p><p class="muted">입력한 세율로만 계산하는 연습용 도구이며 세무 조언이 아닙니다. 국가별 실제 세법은 반영하지 않았습니다.</p></form>`;
  const f = $('tx');
  liveId('tx-r', () => { const gain = (Number(f.sell.value) || 0) - (Number(f.cost.value) || 0); return `예상 세액 ${fmt(Math.max(0, gain) * (Number(f.rate.value) || 0) / 100, 2)}`; });
  f.addEventListener('input', refresh);
  f.addEventListener('submit', e => e.preventDefault());
}
function viewFee(el, path) {
  el.innerHTML = pageHead(path) + `<div class="panel narrow"><div class="tw"><table><tbody><tr><td>현물</td><td class="r">${(E.FEE.spot * 100).toFixed(2)}%</td></tr><tr><td>선물</td><td class="r">${(E.FEE.futures * 100).toFixed(2)}%</td></tr><tr><td>간편 교환</td><td class="r">0%</td></tr></tbody></table></div><p class="muted">이 모의 사이트에 적용되는 값이며 원본 수수료표가 아닙니다.</p></div>`;
}
function viewSupport(el, path) {
  const isLive = path === '/support/live';
  el.innerHTML = pageHead(path) + `<form class="panel form narrow" id="tk"><h3>${isLive ? '모의 상담' : '모의 문의 접수'}</h3><label>제목<input name="subject" required maxlength="80"></label><label>내용<textarea name="body" rows="4" required maxlength="1000"></textarea></label><button class="btn">${isLive ? '보내기' : '접수'}</button><p class="muted">이 브라우저에만 저장되며 MEXC 고객센터로 전달되지 않습니다.</p></form><div class="panel"><h3>접수 내역</h3><div id="tl"></div></div>`;
  liveId('tl', () => state.tickets.length ? `<div class="tw"><table><tbody>${state.tickets.map(t => `<tr><td class="muted">${new Date(t.t).toLocaleString('ko-KR')}</td><td>${esc(t.subject)}</td><td>${esc(t.reply)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">접수 내역이 없습니다.</p>');
  onForm('tk', d => {
    state.tickets.unshift({ t: Date.now(), subject: d.subject, reply: '모의 자동 응답: 접수되었습니다.' });
    $('tk').reset();
  }, '접수했습니다');
}
function viewAccount(el) {
  el.innerHTML = `<h1 class="page-title">모의 계정</h1><div class="panel narrow"><p>이 사이트는 이메일, 비밀번호, 본인 확인 정보를 받지 않습니다. 접속하면 이 브라우저에 가상 자산이 있는 모의 계정이 자동으로 만들어집니다.</p><div class="action-row"><a class="btn" href="${link('/assets')}">내 모의 자산</a><a class="btn ghost" href="${link('/exchange/BTC_USDT')}">거래 시작</a></div></div>`;
}
function viewInfo(el, path) {
  const [, , d] = titleOf(path);
  el.innerHTML = pageHead(path).replace(/<p class="sec-desc">.*<\/p>/, '') + `<div class="panel narrow"><p>${esc(d || '이 메뉴의 모의 안내 화면입니다.')}</p><p class="muted">원본의 문서와 소개 내용은 복제하지 않았습니다. 거래 기능은 아래에서 연습할 수 있습니다.</p><div class="action-row"><a class="btn" href="${link('/exchange/BTC_USDT')}">현물 연습</a><a class="btn ghost" href="${link('/futures/BTC_USDT')}">선물 연습</a><a class="btn ghost" href="${link('/menu-map')}">전체 메뉴</a></div></div>`;
}

/* ---------- 홈·메뉴 지도 ---------- */
function viewHome(el) {
  const cards = ['ZEC', 'XRP', 'SILVER', 'PEPE', 'TAO', 'XAU'];
  el.innerHTML = `<div class="hero"><div><h1><em>위험 없이</em> 연습하는<br>모의 거래</h1><p class="lead">가상 자금 1억 USDT로 현물과 선물, 언, 봇까지 위험 없이 해 보세요. 언제든 상단의 리셋 버튼으로 처음 상태로 돌아갑니다.</p>
      <div class="action-row"><a class="btn big-btn" href="${link('/exchange/BTC_USDT')}">거래 시작</a><a class="btn ghost big-btn" href="${link('/menu-map')}">전체 메뉴 보기</a></div></div>
      <div class="hero-cards" id="hc"></div></div>
    <div class="stats"><div class="stat"><b id="h-eq"></b><span>내 모의 자산 (USDT)</span></div><div class="stat"><b>${Object.keys(SYMBOLS).length}</b><span>모의 종목</span></div><div class="stat"><b>${HEADER_MENUS.length}</b><span>상단 메뉴</span></div><div class="stat"><b>${META.size}</b><span>이동 가능한 모의 화면</span></div></div>
    <h2>인기 종목</h2><div class="panel" id="hm"></div>`;
  liveId('hc', () => cards.map(s => `<a class="tok" href="${link(`/futures/${s}_USDT`)}"><b>${s}</b><span class="t-price">${fmtP(px(s))}</span>${pct(s)}</a>`).join(''));
  liveId('h-eq', () => fmt(E.equity(state, prices()), 2));
  liveId('hm', () => marketTable(['BTC', 'ETH', 'XRP', 'SOL', 'XAU', 'NVDA']));
}
function viewMap(el) {
  const headerCount = HEADER_MENUS.reduce((n, m) => n + m.groups.reduce((k, g) => k + g.items.length, 0), 0);
  const footItems = FOOTER.flatMap(c => c.items.flatMap(i => i.sub || [i]));
  const tag = t => ({ hot: '<span class="tag hot">🔥 인기</span>', new: '<span class="tag">NEW</span>', badge: '<span class="tag badge">강조</span>' }[t] || '');
  el.innerHTML = `<h1 class="page-title">전체 메뉴 구성</h1>
    <p class="lead">2026년 10월 31일 MEXC 영어판의 메뉴 구조를 참고해 직접 번역하고 이름을 바꾼 연습용 구성입니다. MEXC와 관련이 없습니다.</p>
    <div class="stats">${[[HEADER_MENUS.length, '상단 메뉴'], [headerCount, '상단 하위 항목'], [FOOTER.length, '푸터 묶음'], [footItems.length, '푸터 항목']].map(s => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
    <section id="header-menus"><h2>상단 메뉴<small>Header</small></h2><p class="sec-desc">8개 메뉴 중 시장과 리워드 허브는 하위 메뉴 없이 바로 이동합니다.</p>
    ${HEADER_MENUS.map(m => `<article class="menu-block" data-menu><h3>${esc(m.ko)}<small>${esc(m.en)}</small></h3><p>${esc(m.desc)}</p>
      ${m.path && !m.groups.length ? `<a class="lnk" href="${link(m.path)}">${esc(m.ko)} 열기</a>` : ''}
      ${m.groups.map(g => `<div data-group>${g.ko ? `<div class="group-name">${esc(g.ko)} · ${esc(g.en)}</div>` : ''}<div class="grid">${g.items.map(i => `<a class="card" data-item href="${link(i[3])}"><b>${esc(i[0])} ${tag(i[4])}</b><span class="en">${esc(i[1])}</span><span class="d">${esc(i[2])}</span></a>`).join('')}</div></div>`).join('')}</article>`).join('')}
    <p class="empty" id="empty">검색 결과가 없습니다.</p></section>
    <section><h2>구성 분석</h2><p class="sec-desc">원본에서 같은 기능인데 위치에 따라 도착 주소가 다른 지점입니다.</p>
      <div class="menu-block"><ul class="findings">${FINDINGS.map(f => `<li><b>${esc(f[0])}</b>${esc(f[1])}<span class="path">${f[2].map(esc).join('  ↔  ')}</span></li>`).join('')}</ul></div>
      <div class="menu-block"><h3>수집 범위의 한계</h3><p style="margin:0">이벤트와 혜택 문구, 수치는 수집 시점의 홍보 내용입니다. 로그인 후에만 보이는 메뉴와 지역별로 달라지는 메뉴는 포함하지 않았습니다.</p></div></section>`;
  filterMenu();
}
function filterMenu() {
  const q = $('search').value.trim().toLowerCase();
  const blocks = document.querySelectorAll('[data-menu]');
  if (!blocks.length) return;
  let any = false;
  blocks.forEach(b => {
    const headHit = !q || b.querySelector('h3').textContent.toLowerCase().includes(q);
    let hit = headHit;
    b.querySelectorAll('[data-item]').forEach(c => {
      const on = headHit || c.textContent.toLowerCase().includes(q);
      c.style.display = on ? '' : 'none';
      hit = hit || on;
    });
    b.querySelectorAll('[data-group]').forEach(g => {
      g.style.display = [...g.querySelectorAll('[data-item]')].some(c => c.style.display !== 'none') ? '' : 'none';
    });
    b.style.display = hit ? '' : 'none';
    any = any || hit;
  });
  $('empty').style.display = any ? 'none' : 'block';
}

/* ---------- 라우터 ---------- */
const ROUTES = [
  [/^\/$/, (e) => viewHome(e)],
  [/^\/menu-map$/, (e) => viewMap(e)],
  [/^\/assets$/, (e) => viewAssets(e)],
  [/^\/(login|register)$/, (e) => viewAccount(e)],
  [/^\/markets\//, (e, p) => viewMarkets(e, p)],
  [/^\/exchange\/([\w]+)$/, (e, p, m, q) => q.get('type') === 'grid' ? viewGrid(e, p, m[1].split('_')[0]) : viewSpot(e, m[1])],
  [/^\/futures\/coin-m\/(\w+)$/, (e, p, m) => viewFutures(e, m[1], true)],
  [/^\/futures\/trading-bots\/grid(?:\/(\w+))?$/, (e, p, m) => viewGrid(e, p, (m[1] || 'BTC').split('_')[0])],
  [/^\/futures\/copyTrade\/home$/, (e, p) => viewCopy(e, p)],
  [/^\/futures\/stock-futures$/, (e, p) => viewList(e, p, byCat('stock'), '/futures')],
  [/^\/futures\/prediction-futures$/, (e, p) => viewList(e, p, ['BTC', 'ETH', 'XAU', 'USOIL'], '/futures', '이벤트 선물은 일반 모의 선물로 연습합니다.')],
  [/^\/futures\/(\w+)$/, (e, p, m, q) => viewFutures(e, m[1], false, q.get('tab') === 'ai')],
  [/^\/futures$/, (e, p) => viewList(e, p, Object.keys(SYMBOLS).filter(k => SYMBOLS[k][2] !== 'pre'), '/futures')],
  [/^\/demo-trading$/, (e) => viewFutures(e, 'BTC_USDT', false)],
  [/^\/trade-stocks$/, (e, p) => viewList(e, p, byCat('stock'), '/exchange', '주식 가격은 무작위로 움직이는 시뮬레이션입니다.')],
  [/^\/pre-market$/, (e, p) => viewList(e, p, byCat('pre'), '/exchange', '가상의 상장 전 토큰입니다.')],
  [/^\/(memecoin|dex|dex\/onchain)$/, (e, p) => viewList(e, p, byCat('meme'))],
  [/^\/mx$/, (e, p) => viewList(e, p, ['MX'])],
  [/^\/convert$/, (e, p) => viewConvert(e, p)],
  [/^\/trading-bot\/auto-timing$/, (e, p) => viewDca(e, p)],
  [/^\/buy-crypto(\/(p2p|fiat-deposit|bank-transfer|mexc-card))?$/, (e, p) => viewBuy(e, p)],
  [/^\/(staking|earn|earn\/.+|futures-earn-staking)$/, (e, p) => viewEarn(e, p)],
  [/^\/mx-activity\/loan$/, (e, p) => viewLoan(e, p)],
  [/^\/rewards-hub$/, (e, p) => viewRewards(e, p)],
  [/^\/(invite|invite\/.+|affiliate)$/, (e, p) => viewInvite(e, p)],
  [/^\/user\/m-score$/, (e, p) => viewScore(e, p)],
  [/^\/(event-center\/.+|events\/.+|launchpad|token-airdrop|sun\/assessment|zero-fee|futures-mday|futures-activity\/.+)$/, (e, p) => viewEvent(e, p)],
  [/^\/price\/(\w+)\/(\w+)$/, (e, p, m) => viewPrice(e, p, m[1], m[2])],
  [/^\/price(?:\/(\w+))?$/, (e, p, m) => viewPrice(e, p, m[1])],
  [/^\/how-to-buy(?:\/(\w+))?$/, (e, p, m) => viewHowTo(e, p, m[1])],
  [/^\/stocks(?:\/(\w+))?$/, (e, p, m) => m[1] ? viewPrice(e, p, m[1].toUpperCase()) : viewList(e, p, byCat('stock'))],
  [/^\/tools\/crypto-tax-calculator/, (e, p) => viewTax(e, p)],
  [/^\/fee$/, (e, p) => viewFee(e, p)],
  [/^\/(support\/requests.*|support\/ticket\/.+|support\/live|contact\/.+)$/, (e, p) => viewSupport(e, p)],
];
function render() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const q = new URLSearchParams(qs || '');
  const el = $('view');
  live = [];
  for (const [re, fn] of ROUTES) {
    const m = path.match(re);
    if (m) { fn(el, path, m, q); refresh(); done(); return; }
  }
  viewInfo(el, path);
  refresh();
  done();
}
function done() {
  closeAll();
  $('nav').classList.remove('show');
  $('burger').textContent = '☰';
  $('burger').setAttribute('aria-expanded', 'false');
  document.activeElement?.blur?.();
  scrollTo(0, 0);
}

const ACTIONS = {
  cancel: d => attempt(() => E.cancelOrder(state, +d.id), '주문을 취소했습니다'),
  closepos: d => attempt(() => { const p = state.pos.find(x => x.id === +d.id); E.closePos(state, +d.id, px(p.sym)); }, '포지션을 닫았습니다'),
  redeem: d => attempt(() => E.redeem(state, +d.id, Date.now()), '해지했습니다'),
  repay: d => attempt(() => E.repay(state, +d.id, Date.now()), '상환했습니다'),
  advance: () => attempt(() => E.advanceDays(state, 30), '모의 시간을 30일 앞당겼습니다'),
  stopbot: d => attempt(() => E.stopBot(state, +d.id, prices()), '중지했습니다'),
  claim: d => attempt(() => E.claim(state, d.id, +d.amt, titleOf(d.id)[0]), '가상 보상을 받았습니다'),
  reset: () => {
    if (!confirm('잔고, 포지션, 주문, 봇, 내역을 모두 지우고 1억 USDT로 되돌릴까요?')) return;
    state = E.newState();
    save();
    render();
    toast('1억 USDT로 리셋했습니다');
  },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-do]');
  if (b) ACTIONS[b.dataset.do](b.dataset);
});

/* ---------- 고정 UI ---------- */
const tagHtml = t => ({ hot: '<span class="tag hot">🔥 인기</span>', new: '<span class="tag">NEW</span>', badge: '<span class="tag badge">강조</span>' }[t] || '');
$('nav').innerHTML = HEADER_MENUS.map(m => {
  const has = m.groups.length > 0;
  const label = `${esc(m.ko)}${m.tag ? ` <span class="tag">${esc(m.tag)}</span>` : ''}`;
  const top = has
    ? `<button class="nav-link" aria-expanded="false"><span>${label}</span><i class="caret"></i></button>`
    : `<a class="nav-link" href="${link(m.path)}">${label}</a>`;
  const drop = has ? `<div class="drop">${m.groups.map(g => `<div class="drop-col">
      ${g.ko ? `<h4>${esc(g.ko)}</h4>` : ''}
      ${g.items.map(i => `<a class="drop-link" href="${link(i[3])}"><b>${esc(i[0])} ${tagHtml(i[4])}</b><span class="d">${esc(i[2])}</span></a>`).join('')}
    </div>`).join('')}</div>` : '';
  return `<div class="nav-item">${top}${drop}</div>`;
}).join('');
const footLink = i => `<a href="${link(i[2])}">${esc(i[0])}</a>`;
$('foot').innerHTML = FOOTER.map(c => `<div><h4>${esc(c.ko)}<small>${esc(c.en)}</small></h4>
  ${c.items.map(i => i.sub ? `<details><summary>${esc(i.ko)}</summary>${i.sub.map(footLink).join('')}</details>` : footLink(i)).join('')}</div>`).join('');
$('tabs').innerHTML = MOBILE_TABS.map(t => `<a href="${link(t[2])}">${esc(t[0])}</a>`).join('');

const items = [...document.querySelectorAll('.nav-item')];
function closeAll(except) {
  items.forEach(n => {
    if (n === except) return;
    n.classList.remove('open');
    n.querySelector('button')?.setAttribute('aria-expanded', 'false');
  });
}
items.forEach(n => n.querySelector('button')?.addEventListener('click', () => {
  closeAll(n);
  n.querySelector('button').setAttribute('aria-expanded', n.classList.toggle('open'));
}));
document.addEventListener('click', e => { if (!e.target.closest('.nav-item')) closeAll(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeAll();
  document.activeElement?.blur();
});
$('burger').addEventListener('click', () => {
  const show = $('nav').classList.toggle('show');
  $('burger').setAttribute('aria-expanded', show);
  $('burger').textContent = show ? '✕' : '☰';
});
$('search').addEventListener('input', () => {
  if (!location.hash.startsWith('#/menu-map')) location.hash = '/menu-map';
  else filterMenu();
});
addEventListener('hashchange', render);

render();
pollLive().then(refresh);
setInterval(pulse, 2000);
setInterval(() => pollLive(), 5000);
