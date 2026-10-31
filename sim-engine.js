// 모의 거래 엔진. 화면과 분리된 순수 로직이며 실제 돈이나 외부 주문과 연결되지 않는다
const FEE = { spot: 0.0005, futures: 0.0002 };
const MAINT = 0.005; // ponytail: 고정 유지증거금, 구간별 증거금이 필요하면 레버리지별 표로 교체
const YEAR_MS = 365 * 86400000;
const START_USDT = 100000000;

function newState() {
  return {
    v: 1, seq: 1, offset: 0, vol: 0,
    bal: { USDT: START_USDT },
    orders: [], pos: [], stakes: [], loans: [], bots: [], hist: [], claimed: {}, tickets: [], extPx: {},
  };
}

function num(x, label = '수량') {
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label}을 0보다 크게 입력하세요`);
  return n;
}
function spend(s, asset, amt) {
  if ((s.bal[asset] || 0) < amt - 1e-12) throw new Error(`${asset} 잔고가 부족합니다`);
  s.bal[asset] = Math.max(0, s.bal[asset] - amt);
}
function credit(s, asset, amt) { s.bal[asset] = (s.bal[asset] || 0) + amt; }
function log(s, type, text) {
  s.hist.unshift({ t: Date.now(), type, text });
  s.hist.length = Math.min(s.hist.length, 200);
}
function priceOf(prices, sym) {
  const p = prices[sym];
  if (!(p > 0)) throw new Error(`${sym} 가격이 없습니다`);
  return p;
}

function deposit(s, asset, amt) {
  amt = num(amt, '금액');
  credit(s, asset, amt);
  log(s, '충전', `가상 ${asset} ${amt} 충전`);
}

function spotMarket(s, sym, side, qty, price) {
  qty = num(qty);
  const value = qty * num(price, '가격');
  if (side === 'buy') {
    spend(s, 'USDT', value * (1 + FEE.spot));
    credit(s, sym, qty);
  } else {
    spend(s, sym, qty);
    credit(s, 'USDT', value * (1 - FEE.spot));
  }
  s.vol += value;
  log(s, '현물', `${sym} ${side === 'buy' ? '매수' : '매도'} ${qty} @ ${price}`);
}

function placeLimit(s, sym, side, qty, limit) {
  qty = num(qty);
  limit = num(limit, '지정가');
  const reserved = side === 'buy' ? qty * limit * (1 + FEE.spot) : qty;
  spend(s, side === 'buy' ? 'USDT' : sym, reserved);
  const order = { id: s.seq++, sym, side, qty, limit, reserved, t: Date.now() };
  s.orders.push(order);
  log(s, '현물', `${sym} ${side === 'buy' ? '매수' : '매도'} 지정가 ${limit} 접수`);
  return order;
}
function cancelOrder(s, id) {
  const i = s.orders.findIndex(o => o.id === id);
  if (i < 0) throw new Error('주문을 찾을 수 없습니다');
  const [o] = s.orders.splice(i, 1);
  credit(s, o.side === 'buy' ? 'USDT' : o.sym, o.reserved);
  log(s, '현물', `${o.sym} 지정가 주문 취소`);
}
function matchOrders(s, prices) {
  s.orders = s.orders.filter(o => {
    const p = prices[o.sym];
    if (!(o.side === 'buy' ? p <= o.limit : p >= o.limit)) return true;
    const value = o.qty * o.limit;
    if (o.side === 'buy') credit(s, o.sym, o.qty);
    else credit(s, 'USDT', value * (1 - FEE.spot));
    s.vol += value;
    log(s, '현물', `${o.sym} 지정가 ${o.side === 'buy' ? '매수' : '매도'} 체결 @ ${o.limit}`);
    return false;
  });
}

function liqPrice(side, entry, lev, inverse) {
  const a = 1 / lev - MAINT;
  if (inverse) return side === 'long' ? entry / (1 + a) : entry / (1 - Math.min(a, 0.999));
  return side === 'long' ? entry * (1 - a) : entry * (1 + a);
}
function openPos(s, { sym, side, margin, lev, price, settle = 'USDT', inverse = false, tp, sl }) {
  margin = num(margin, '증거금');
  lev = num(lev, '레버리지');
  price = num(price, '가격');
  if (lev > 200) throw new Error('레버리지는 200배까지입니다');
  const notional = margin * lev;
  const fee = notional * FEE.futures;
  spend(s, settle, margin + fee);
  const pos = {
    id: s.seq++, sym, side, margin, lev, entry: price, settle, inverse,
    qty: inverse ? notional * price : notional / price,
    liq: liqPrice(side, price, lev, inverse),
    tp: tp > 0 ? Number(tp) : null, sl: sl > 0 ? Number(sl) : null, t: Date.now(), auto: true,
  };
  s.pos.push(pos);
  s.vol += inverse ? pos.qty : notional;
  log(s, '선물', `${sym} ${side === 'long' ? '롱' : '숏'} ${lev}배 진입 @ ${price}`);
  return pos;
}
function posPnl(p, price) {
  const dir = p.side === 'long' ? 1 : -1;
  return p.inverse ? p.qty * (1 / p.entry - 1 / price) * dir : p.qty * (price - p.entry) * dir;
}
function closePos(s, id, price, reason = '청산') {
  const i = s.pos.findIndex(x => x.id === id);
  if (i < 0) throw new Error('포지션을 찾을 수 없습니다');
  const [p] = s.pos.splice(i, 1);
  const pnl = posPnl(p, price);
  const fee = (p.inverse ? p.qty / price : p.qty * price) * FEE.futures;
  const back = Math.max(0, p.margin + pnl - fee);
  credit(s, p.settle, back);
  addRealized(s, p, back - p.margin);
  log(s, '선물', `${p.sym} ${reason} @ ${price}, 손익 ${pnl.toFixed(4)} ${p.settle}`);
  return pnl;
}
// 실현 손익에는 진입·청산 수수료를 모두 포함한다
function addRealized(s, p, net) {
  const entryFee = (p.inverse ? p.qty / p.entry : p.qty * p.entry) * FEE.futures;
  s.realized = s.realized || {};
  s.realized[p.settle] = (s.realized[p.settle] || 0) + net - entryFee;
}
function positionSummary(s, settle, prices) {
  let margin = 0, unreal = 0, count = 0;
  for (const p of s.pos) {
    if (p.settle !== settle) continue;
    count++;
    margin += p.margin;
    if (prices[p.sym] > 0) unreal += posPnl(p, prices[p.sym]);
  }
  const avail = s.bal[settle] || 0;
  return { count, margin, unreal, roe: margin > 0 ? unreal / margin * 100 : 0, avail, balance: avail + margin + unreal, realized: s.realized?.[settle] || 0 };
}
function orderPreview({ margin, lev, price, tp, sl, inverse = false }) {
  margin = Number(margin); lev = Number(lev); price = Number(price); tp = Number(tp); sl = Number(sl);
  if (!(margin > 0 && lev > 0 && price > 0)) return null;
  const notional = margin * lev;
  const qty = inverse ? notional * price : notional / price;
  const fee = notional * FEE.futures;
  // 방향을 고르기 전이라 익절가·손절가가 현재가 어느 쪽인지로 롱·숏을 판단한다
  const side = tp > 0 ? (tp >= price ? 'long' : 'short') : sl > 0 ? (sl <= price ? 'long' : 'short') : null;
  const at = x => side && x > 0 ? posPnl({ side, inverse, qty, entry: price }, x) : null;
  return { notional, qty, fee, cost: margin + fee, liqLong: liqPrice('long', price, lev, inverse), liqShort: liqPrice('short', price, lev, inverse), side, tpPnl: at(tp), slPnl: at(sl) };
}
function findPos(s, id) {
  const p = s.pos.find(x => x.id === id);
  if (!p) throw new Error('포지션을 찾을 수 없습니다');
  return p;
}
function pushMargin(p, amt) {
  p.margin += amt;
  p.liq = liqPrice(p.side, p.entry, (p.inverse ? p.qty / p.entry : p.qty * p.entry) / p.margin, p.inverse);
}
function addMargin(s, id, amt) {
  const p = findPos(s, id);
  amt = num(amt, '추가 마진');
  spend(s, p.settle, amt);
  pushMargin(p, amt);
  log(s, '선물', `${p.sym} 마진 ${amt} ${p.settle} 추가, 새 청산가 ${Number(p.liq.toPrecision(8))}`);
}
function toggleAuto(s, id) {
  const p = findPos(s, id);
  p.auto = !p.auto;
  log(s, '선물', `${p.sym} 자동 마진 ${p.auto ? '켜짐' : '꺼짐'}`);
  return p.auto;
}
function reversePos(s, id, price) {
  const p = findPos(s, id);
  price = num(price, '가격');
  const notional = p.inverse ? p.qty / price : p.qty * price;
  const margin = notional / p.lev;
  const back = Math.max(0, p.margin + posPnl(p, price) - notional * FEE.futures);
  if ((s.bal[p.settle] || 0) + back < margin + notional * FEE.futures) throw new Error(`${p.settle} 잔고가 부족해 반대 포지션을 열 수 없습니다`);
  closePos(s, id, price, '역방향 전환');
  return openPos(s, { sym: p.sym, side: p.side === 'long' ? 'short' : 'long', margin, lev: p.lev, price, settle: p.settle, inverse: p.inverse });
}
// 시뮬레이터와 같은 규칙: 청산가 2% 안으로 들어오면 현재 마진의 50%를 넣고, 잔고가 모자라면 남은 전액을 넣는다
function guardMargin(s, p, x) {
  if (!(p.side === 'long' ? x <= p.liq * 1.02 : x >= p.liq * 0.98)) return;
  const amt = Math.min(p.margin * 0.5, s.bal[p.settle] || 0);
  if (amt > 0) {
    spend(s, p.settle, amt);
    pushMargin(p, amt);
    log(s, '자동 마진', `${p.sym} 청산 위험, ${amt.toFixed(4)} ${p.settle} 자동 추가`);
  } else if (!p.noFunds) {
    p.noFunds = true;
    log(s, '자동 마진', `${p.sym} 청산 위험, ${p.settle} 잔고가 없어 추가하지 못했습니다`);
  }
}
function checkPositions(s, prices) {
  for (const p of [...s.pos]) {
    const x = prices[p.sym];
    const long = p.side === 'long';
    if (p.auto) guardMargin(s, p, x);
    if (long ? x <= p.liq : x >= p.liq) {
      s.pos.splice(s.pos.indexOf(p), 1);
      addRealized(s, p, -p.margin);
      log(s, '선물', `${p.sym} 강제 청산 @ ${x}, 증거금 ${p.margin} ${p.settle} 소진`);
    } else if (p.tp && (long ? x >= p.tp : x <= p.tp)) closePos(s, p.id, x, '익절');
    else if (p.sl && (long ? x <= p.sl : x >= p.sl)) closePos(s, p.id, x, '손절');
  }
}

function convert(s, from, to, amt, prices) {
  amt = num(amt, '금액');
  if (from === to) throw new Error('서로 다른 자산을 고르세요');
  const got = amt * priceOf(prices, from) / priceOf(prices, to);
  spend(s, from, amt);
  credit(s, to, got);
  log(s, '교환', `${from} ${amt} → ${to} ${got}`);
  return got;
}

function simNow(s, now) { return now + s.offset; }
function accrued(principal, apr, start, s, now) {
  return principal * apr * Math.max(0, simNow(s, now) - start) / YEAR_MS;
}
function stake(s, product, amt, now) {
  amt = num(amt, '금액');
  spend(s, product.asset, amt);
  s.stakes.push({ id: s.seq++, name: product.name, asset: product.asset, apr: product.apr, amt, start: simNow(s, now) });
  log(s, '언', `${product.name}에 ${amt} ${product.asset} 예치`);
}
function redeem(s, id, now) {
  const i = s.stakes.findIndex(x => x.id === id);
  if (i < 0) throw new Error('예치 내역을 찾을 수 없습니다');
  const [x] = s.stakes.splice(i, 1);
  const interest = accrued(x.amt, x.apr, x.start, s, now);
  credit(s, x.asset, x.amt + interest);
  log(s, '언', `${x.name} 해지, 이자 ${interest.toFixed(6)} ${x.asset}`);
  return interest;
}
function advanceDays(s, days) {
  s.offset += num(days, '일수') * 86400000;
  log(s, '시간', `모의 시간 ${days}일 앞당김`);
}

function borrow(s, { asset, amt, collateral, coll, apr }, prices, now) {
  amt = num(amt, '대출 금액');
  coll = num(coll, '담보');
  if (amt * priceOf(prices, asset) > coll * priceOf(prices, collateral) * 0.5) throw new Error('담보 가치의 50%까지만 빌릴 수 있습니다');
  spend(s, collateral, coll);
  credit(s, asset, amt);
  s.loans.push({ id: s.seq++, asset, amt, collateral, coll, apr, start: simNow(s, now) });
  log(s, '대출', `${collateral} ${coll} 담보로 ${asset} ${amt} 대출`);
}
function repay(s, id, now) {
  const i = s.loans.findIndex(x => x.id === id);
  if (i < 0) throw new Error('대출을 찾을 수 없습니다');
  const x = s.loans[i];
  const owed = x.amt + accrued(x.amt, x.apr, x.start, s, now);
  spend(s, x.asset, owed);
  s.loans.splice(i, 1);
  credit(s, x.collateral, x.coll);
  log(s, '대출', `${x.asset} ${owed.toFixed(4)} 상환, 담보 반환`);
  return owed;
}

function createGrid(s, { sym, low, high, n, invest, price }) {
  low = num(low, '하단 가격');
  high = num(high, '상단 가격');
  n = Math.floor(num(n, '그리드 수'));
  invest = num(invest, '투자금');
  if (low >= high) throw new Error('상단 가격은 하단 가격보다 커야 합니다');
  if (n < 2 || n > 100) throw new Error('그리드 수는 2~100개입니다');
  spend(s, 'USDT', invest);
  const levels = Array.from({ length: n + 1 }, (_, i) => low + (high - low) * i / n);
  const bot = { id: s.seq++, kind: 'grid', sym, levels, quote: invest, invest, per: invest / n, last: price, slots: [], profit: 0, t: Date.now() };
  s.bots.push(bot);
  log(s, '봇', `${sym} 그리드 봇 시작, ${n}칸`);
  return bot;
}
function gridStep(bot, price) {
  const { levels, last } = bot;
  for (const lv of (price < last ? [...levels].reverse() : levels)) {
    if (price < last && lv < last && lv >= price && bot.quote >= bot.per - 1e-9) {
      bot.quote -= bot.per;
      bot.slots.push({ level: lv, qty: bot.per * (1 - FEE.spot) / lv, cost: bot.per });
    } else if (price > last && lv > last && lv <= price) {
      const slot = bot.slots.find(x => x.level < lv);
      if (!slot) continue;
      bot.slots.splice(bot.slots.indexOf(slot), 1);
      const got = slot.qty * lv * (1 - FEE.spot);
      bot.quote += got;
      bot.profit += got - slot.cost;
    }
  }
  bot.last = price;
}
function createDca(s, { sym, amt, everyMs }, now) {
  amt = num(amt, '회당 금액');
  const bot = { id: s.seq++, kind: 'dca', sym, amt, everyMs: num(everyMs, '주기'), next: now, bought: 0, spent: 0, t: now };
  s.bots.push(bot);
  log(s, '봇', `${sym} DCA 시작, 회당 ${amt} USDT`);
  return bot;
}
function follow(s, trader, amt) {
  amt = num(amt, '금액');
  spend(s, 'USDT', amt);
  const bot = { id: s.seq++, kind: 'copy', name: trader.name, drift: trader.drift, swing: trader.swing, invest: amt, eq: amt, t: Date.now() };
  s.bots.push(bot);
  log(s, '카피', `${trader.name} 팔로우, ${amt} USDT`);
  return bot;
}
function botValue(b, prices) {
  if (b.kind === 'grid') return b.quote + b.slots.reduce((n, x) => n + x.qty * prices[b.sym], 0);
  return b.kind === 'copy' ? b.eq : 0;
}
function stopBot(s, id, prices) {
  const i = s.bots.findIndex(x => x.id === id);
  if (i < 0) throw new Error('봇을 찾을 수 없습니다');
  const [b] = s.bots.splice(i, 1);
  const back = botValue(b, prices);
  if (back > 0) credit(s, 'USDT', back);
  log(s, '봇', `봇 중지, ${back.toFixed(2)} USDT 회수`);
  return back;
}
function stepBots(s, prices, now, rand) {
  for (const b of s.bots) {
    if (b.kind === 'grid') gridStep(b, prices[b.sym]);
    if (b.kind === 'copy') b.eq = Math.max(0, b.eq * (1 + b.drift + (rand() - 0.5) * b.swing));
    if (b.kind === 'dca' && now >= b.next) {
      b.next = now + b.everyMs;
      if ((s.bal.USDT || 0) < b.amt * (1 + FEE.spot)) continue;
      const qty = b.amt / prices[b.sym];
      spotMarket(s, b.sym, 'buy', qty, prices[b.sym]);
      b.bought += qty;
      b.spent += b.amt;
    }
  }
}

function claim(s, id, amt, label, asset = 'USDT') {
  if (s.claimed[id]) throw new Error('이미 받은 모의 보상입니다');
  s.claimed[id] = true;
  credit(s, asset, amt);
  log(s, '보상', `${label}: 가상 ${amt} ${asset}`);
}

function tick(s, prices, now = Date.now(), rand = Math.random) {
  matchOrders(s, prices);
  checkPositions(s, prices);
  stepBots(s, prices, now, rand);
}

function equity(s, prices) {
  const v = (a, x) => x * (prices[a] || 0);
  let total = 0;
  for (const a in s.bal) total += v(a, s.bal[a]);
  for (const o of s.orders) total += v(o.side === 'buy' ? 'USDT' : o.sym, o.reserved);
  for (const p of s.pos) total += v(p.settle, Math.max(0, p.margin + posPnl(p, prices[p.sym])));
  for (const x of s.stakes) total += v(x.asset, x.amt + accrued(x.amt, x.apr, x.start, s, Date.now()));
  for (const x of s.loans) total += v(x.collateral, x.coll) - v(x.asset, x.amt + accrued(x.amt, x.apr, x.start, s, Date.now()));
  for (const b of s.bots) total += botValue(b, prices);
  return total;
}

const SimEngine = {
  FEE, START_USDT, newState, deposit, spotMarket, placeLimit, cancelOrder, matchOrders, liqPrice, openPos, posPnl, closePos, positionSummary, orderPreview, addMargin, toggleAuto, reversePos,
  checkPositions, convert, accrued, stake, redeem, advanceDays, borrow, repay, createGrid, gridStep, createDca,
  follow, botValue, stopBot, claim, tick, equity, simNow,
};
if (typeof module !== 'undefined') module.exports = SimEngine;
