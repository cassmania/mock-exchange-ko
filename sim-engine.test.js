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

console.log('sim-engine: 모든 검사 통과');
