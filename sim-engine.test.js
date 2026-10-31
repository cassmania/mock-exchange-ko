// 실행: node sim-engine.test.js
const assert = require('assert');
const E = require('./sim-engine.js');
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-6, `${m}: ${a} != ${b}`);
const fresh = () => {
  const s = E.newState();
  s.bal = { USDT: 10000, USDC: 1000, USD1: 1000, BTC: 0.05, KRW: 5000000 };
  return s;
};
assert.deepEqual(E.newState().bal, { USDT: 100000000 }, '시작 자금은 1억 USDT');
const P = { USDT: 1, USDC: 1, USD1: 1, KRW: 1 / 1400, BTC: 100, ETH: 10 };
const T0 = 1800000000000;

let s = fresh();
E.spotMarket(s, 'BTC', 'buy', 1, 100);
near(s.bal.USDT, 10000 - 100.05, '현물 매수 수수료');
near(s.bal.BTC, 1.05, '현물 매수 수량');
E.spotMarket(s, 'BTC', 'sell', 1, 200);
near(s.bal.USDT, 10000 - 100.05 + 199.9, '현물 매도 대금');
assert.throws(() => E.spotMarket(s, 'BTC', 'sell', 99, 100), /잔고/);
assert.throws(() => E.spotMarket(s, 'BTC', 'buy', -1, 100), /0보다/);
assert.throws(() => E.spotMarket(s, 'BTC', 'buy', NaN, 100), /0보다/);

s = fresh();
const o = E.placeLimit(s, 'BTC', 'buy', 1, 90);
near(s.bal.USDT, 10000 - 90.045, '지정가 예약');
E.matchOrders(s, { BTC: 95 });
assert.equal(s.orders.length, 1, '미체결 유지');
E.cancelOrder(s, o.id);
near(s.bal.USDT, 10000, '취소 시 환불');
E.placeLimit(s, 'BTC', 'buy', 1, 90);
E.matchOrders(s, { BTC: 89 });
assert.equal(s.orders.length, 0, '체결');
near(s.bal.BTC, 1.05, '체결 수량');
E.placeLimit(s, 'BTC', 'sell', 1, 110);
E.matchOrders(s, { BTC: 111 });
near(s.bal.BTC, 0.05, '매도 체결 수량');

s = fresh();
let p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 10, price: 100 });
near(s.bal.USDT, 10000 - 100 - 0.2, '선물 증거금과 수수료');
near(p.qty, 10, '선물 수량');
near(E.posPnl(p, 110), 100, '롱 수익');
near(p.liq, 100 * (1 - 0.1 + 0.005), '롱 청산가');
near(E.closePos(s, p.id, 110), 100, '청산 손익');
near(s.bal.USDT, 10000 - 0.2 + 100 - 0.22, '청산 후 잔고');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'short', margin: 100, lev: 10, price: 100 });
near(E.posPnl(p, 90), 100, '숏 수익');
near(p.liq, 100 * (1 + 0.1 - 0.005), '숏 청산가');
E.toggleAuto(s, p.id);
E.checkPositions(s, { BTC: p.liq + 1 });
assert.equal(s.pos.length, 0, '숏 강제 청산');
near(s.bal.USDT, 10000 - 100.2, '강제 청산은 증거금 소진');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 2, price: 100, tp: 120, sl: 80 });
E.checkPositions(s, { BTC: 110 });
assert.equal(s.pos.length, 1, '목표가 전 유지');
E.checkPositions(s, { BTC: 120 });
assert.equal(s.pos.length, 0, '익절 실행');
s = fresh();
E.openPos(s, { sym: 'BTC', side: 'short', margin: 100, lev: 2, price: 100, tp: 80, sl: 120 });
E.checkPositions(s, { BTC: 120 });
assert.equal(s.pos.length, 0, '숏 손절 실행');
assert.throws(() => E.openPos(fresh(), { sym: 'BTC', side: 'long', margin: 1, lev: 500, price: 1 }), /200배/);

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 0.01, lev: 10, price: 100, settle: 'BTC', inverse: true });
near(p.qty, 10, '코인 마진 계약 금액');
near(E.posPnl(p, 200), 0.05, '코인 마진 손익은 코인 단위');
assert.ok(p.liq < 100 && p.liq > 90, '코인 마진 청산가');

s = fresh();
near(E.convert(s, 'USDT', 'BTC', 100, P), 1, '교환 환산');
assert.throws(() => E.convert(s, 'USDT', 'USDT', 1, P), /서로 다른/);

s = fresh();
E.stake(s, { name: 'A', asset: 'USDT', apr: 0.365 }, 1000, T0);
E.advanceDays(s, 10);
near(E.redeem(s, s.stakes[0].id, T0), 10, '10일 이자');
near(s.bal.USDT, 10010, '해지 후 원금과 이자');

s = fresh();
assert.throws(() => E.borrow(s, { asset: 'USDT', amt: 10, collateral: 'BTC', coll: 0.05, apr: 0.1 }, P, T0), /50%/);
E.borrow(s, { asset: 'USDT', amt: 2, collateral: 'BTC', coll: 0.05, apr: 0.365 }, P, T0);
near(s.bal.BTC, 0, '담보 차감');
E.advanceDays(s, 100);
near(E.repay(s, s.loans[0].id, T0), 2.2, '원리금 상환');
near(s.bal.BTC, 0.05, '담보 반환');

s = fresh();
let g = E.createGrid(s, { sym: 'BTC', low: 90, high: 110, n: 4, invest: 400, price: 100 });
near(s.bal.USDT, 9600, '그리드 투자금 차감');
E.gridStep(g, 94);
assert.equal(g.slots.length, 1, '100에서 94로 내리면 95 한 칸만 매수');
E.gridStep(g, 106);
assert.equal(g.slots.length, 0, '상승 시 매도');
assert.ok(g.profit > 0, '그리드 수익 발생');
const before = s.bal.USDT;
const back = E.stopBot(s, g.id, { BTC: 106 });
near(s.bal.USDT, before + back, '봇 중지 회수');
assert.throws(() => E.createGrid(s, { sym: 'BTC', low: 110, high: 90, n: 4, invest: 1, price: 100 }), /상단/);

s = fresh();
const d = E.createDca(s, { sym: 'BTC', amt: 100, everyMs: 1000 }, T0);
E.tick(s, P, T0, () => 0.5);
E.tick(s, P, T0 + 500, () => 0.5);
near(d.spent, 100, 'DCA 주기 전 재매수 없음');
E.tick(s, P, T0 + 1000, () => 0.5);
near(d.spent, 200, 'DCA 주기 후 매수');

s = fresh();
const c = E.follow(s, { name: 'X', drift: 0.01, swing: 0 }, 100);
E.tick(s, P, T0, () => 0.5);
near(c.eq, 101, '카피 평가금');
near(E.stopBot(s, c.id, P), 101, '카피 회수');

s = fresh();
E.claim(s, 'a', 5, '테스트');
near(s.bal.USDT, 10005, '보상 지급');
assert.throws(() => E.claim(s, 'a', 5, '테스트'), /이미/);

s = fresh();
const px = { ...P, BTC: 100 };
const start = E.equity(s, px);
E.spotMarket(s, 'BTC', 'buy', 1, 100);
near(E.equity(s, px), start - 0.05, '평가액은 수수료만큼 감소');
E.placeLimit(s, 'BTC', 'buy', 1, 50);
near(E.equity(s, px), start - 0.05, '지정가 예약은 평가액 유지');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 10, price: 100 });
assert.equal(p.auto, true, '포지션을 열면 자동 마진 켜짐');
assert.equal(E.toggleAuto(s, p.id), false, '자동 마진 끄기');
E.toggleAuto(s, p.id);
let usdt = s.bal.USDT;
E.addMargin(s, p.id, 100);
near(s.bal.USDT, usdt - 100, '마진 추가 잔고 차감');
near(p.margin, 200, '마진 추가 반영');
near(p.liq, 100 * (1 - 0.2 + 0.005), '마진 추가 후 롱 청산가 하락');
assert.throws(() => E.addMargin(s, p.id, 1e9), /잔고/);
assert.throws(() => E.addMargin(s, p.id, -1), /0보다/);
usdt = s.bal.USDT;
E.closePos(s, p.id, 100);
near(s.bal.USDT, usdt + 200 - 0.2, '추가한 마진도 청산 때 돌려받음');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'short', margin: 100, lev: 10, price: 100 });
E.addMargin(s, p.id, 100);
near(p.liq, 100 * (1 + 0.2 - 0.005), '마진 추가 후 숏 청산가 상승');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 10, price: 100 });
E.checkPositions(s, { BTC: 93 });
near(p.margin, 100, '청산가 2% 밖이면 자동 마진 없음');
usdt = s.bal.USDT;
const oldLiq = p.liq;
E.checkPositions(s, { BTC: oldLiq * 1.01 });
near(p.margin, 150, '청산가 2% 안이면 현재 마진 50% 추가');
near(s.bal.USDT, usdt - 50, '자동 마진 잔고 차감');
assert.ok(p.liq < oldLiq, '자동 마진 후 청산가 하락');
assert.equal(s.pos.length, 1, '자동 마진으로 청산 회피');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'short', margin: 100, lev: 10, price: 100 });
const off = p.liq;
E.toggleAuto(s, p.id);
E.checkPositions(s, { BTC: off * 0.99 });
near(p.margin, 100, '자동 마진을 끄면 추가 없음');
E.checkPositions(s, { BTC: off + 1 });
assert.equal(s.pos.length, 0, '자동 마진을 끄면 강제 청산');

s = fresh();
s.bal.USDT = 130;
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 10, price: 100 });
const rest = s.bal.USDT;
E.checkPositions(s, { BTC: p.liq * 1.01 });
near(p.margin, 100 + rest, '잔고가 모자라면 남은 전액 투입');
near(s.bal.USDT, 0, '잔고 전액 소진');
const logs = s.hist.length;
s.pos[0].liq = 90;
E.checkPositions(s, { BTC: 90.5 });
E.checkPositions(s, { BTC: 90.5 });
assert.equal(s.hist.length, logs + 1, '잔고 없음 경고는 한 번만');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 10, price: 100, tp: 200, sl: 50 });
const r = E.reversePos(s, p.id, 110);
assert.equal(s.pos.length, 1, '역방향은 한 포지션만 남김');
assert.equal(r.side, 'short', '역방향 전환');
near(r.qty, p.qty, '역방향은 같은 수량');
assert.equal(r.lev, 10, '역방향은 같은 레버리지');
near(r.entry, 110, '역방향 진입가는 현재가');
near(r.margin, 110, '역방향 마진은 현재가 기준');
assert.equal(r.auto, true, '역방향 포지션도 자동 마진 켜짐');
assert.equal(r.tp, null, '역방향은 이전 익절가를 물려받지 않음');
near(s.bal.USDT, 10000 - 100.2 + 100 + 100 - 0.22 - 110 - 0.22, '역방향 정산 후 잔고');

s = fresh();
s.bal.USDT = 100.2;
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 10, price: 100 });
assert.throws(() => E.reversePos(s, p.id, 50), /잔고가 부족/);
assert.equal(s.pos[0].id, p.id, '역방향 실패 시 기존 포지션 유지');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'short', margin: 0.01, lev: 2, price: 100, settle: 'BTC', inverse: true });
E.addMargin(s, p.id, 0.03);
assert.ok(Number.isFinite(p.liq) && p.liq > 100, '코인 마진 숏은 마진을 늘려도 청산가가 유한');
assert.equal(JSON.parse(JSON.stringify(p)).liq, p.liq, '저장해도 청산가 유지');

s = fresh();
for (let i = 0; i < 300; i++) E.openPos(s, { sym: i % 2 ? 'BTC' : 'ETH', side: i % 3 ? 'long' : 'short', margin: 1, lev: 2, price: 100 });
assert.equal(s.pos.length, 300, '포지션 개수 제한 없음');
E.checkPositions(s, { BTC: 100, ETH: 100 });
assert.equal(s.pos.length, 300, '다른 코인과 같은 코인 포지션이 공존');
assert.equal(new Set(s.pos.map(x => x.id)).size, 300, '포지션마다 별도 번호');

// 계좌 요약: 미실현·수익률·마진 잔고·실현 손익
s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 10, price: 100 });
E.openPos(s, { sym: 'ETH', side: 'short', margin: 50, lev: 2, price: 10 });
let sum = E.positionSummary(s, 'USDT', { BTC: 110, ETH: 10 });
near(sum.unreal, 100, '롱 10배 10% 상승이면 미실현 +100');
near(sum.margin, 150, '투입 마진 합계');
near(sum.roe, 100 / 150 * 100, '수익률은 투입 마진 대비');
near(sum.avail, 10000 - 100.2 - 50.02, '사용 가능');
near(sum.balance, sum.avail + 150 + 100, '마진 잔고 = 사용 가능 + 마진 + 미실현');
near(sum.realized, 0, '청산 전 실현 손익 0');
assert.equal(sum.count, 2);
E.closePos(s, p.id, 110);
near(E.positionSummary(s, 'USDT', { BTC: 110, ETH: 10 }).realized, 100 - 0.22 - 0.2, '실현 손익은 양쪽 수수료 차감');
near(E.positionSummary(s, 'USDT', { ETH: 12 }).unreal, -20, '숏은 가격 상승 시 손실');
near(E.positionSummary(s, 'USDT', {}).unreal, 0, '가격이 없는 종목은 미실현에서 제외');

s = fresh();
p = E.openPos(s, { sym: 'BTC', side: 'long', margin: 100, lev: 10, price: 100 });
E.toggleAuto(s, p.id);
E.checkPositions(s, { BTC: 80 });
assert.equal(s.pos.length, 0, '자동 마진 끄면 강제 청산');
near(E.positionSummary(s, 'USDT', {}).realized, -100.2, '강제 청산은 마진과 진입 수수료 손실');

// 주문 미리보기
let pv = E.orderPreview({ margin: 3000, lev: 10, price: 100, tp: 110, sl: 95 });
near(pv.notional, 30000, '포지션 크기');
near(pv.qty, 300, '수량');
near(pv.fee, 6, '진입 수수료');
near(pv.cost, 3006, '필요 금액');
near(pv.liqLong, E.liqPrice('long', 100, 10, false), '롱 청산가');
near(pv.liqShort, E.liqPrice('short', 100, 10, false), '숏 청산가');
assert.equal(pv.side, 'long', '익절가가 위면 롱 기준');
near(pv.tpPnl, 3000, '익절 시 손익');
near(pv.slPnl, -1500, '손절 시 손익');
pv = E.orderPreview({ margin: 100, lev: 2, price: 100, tp: 90 });
assert.equal(pv.side, 'short', '익절가가 아래면 숏 기준');
near(pv.tpPnl, 20, '숏 익절 손익');
assert.equal(pv.slPnl, null, '손절가가 없으면 계산하지 않음');
assert.equal(E.orderPreview({ margin: '', lev: 10, price: 100 }), null, '증거금이 비면 미리보기 없음');
assert.equal(E.orderPreview({ margin: 100, lev: 10, price: 100 }).side, null, '익절·손절이 없으면 방향 미정');

console.log('sim-engine: 모든 검사 통과');
