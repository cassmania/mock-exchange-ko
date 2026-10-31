// 연습용 메뉴 구성. 2026-10-31 MEXC 영어판 메뉴 구조를 참고해 이름을 바꿨다
// 헤더: /api/operation/header/v2/configs 응답, 푸터: 렌더된 페이지의 링크
// 경로는 모두 이 사이트 안의 모의 화면으로 연결된다
// i = [한국어 이름, 원문 이름, 한국어 설명, 경로, 배지]

const HEADER_MENUS = [
  { id: 'buy', ko: '코인 구매', en: 'Buy Crypto', desc: '안전하고 빠른 저수수료 구매', path: '/buy-crypto', groups: [
    { items: [
      ['간편 매수/매도', 'Quick Buy/Sell', '카드와 모바일 결제로 사고팔기', '/buy-crypto'],
      ['P2P', 'P2P', '현지 결제 수단으로 최적 가격에 거래', '/buy-crypto/p2p', 'badge'],
      ['법정화폐 입금', 'Fiat Deposit', 'BRL, COP, EUR 등으로 입금', '/buy-crypto/fiat-deposit'],
      ['글로벌 은행 송금', 'Global Bank Transfer', '현지 은행을 통해 사고팔기', '/buy-crypto/bank-transfer'],
      ['가상 카드', 'Mock Card', '코인 잔고로 가상 결제', '/buy-crypto/mexc-card', 'badge'],
    ] },
  ] },
  { id: 'markets', ko: '시장', en: 'Markets', desc: '하위 메뉴 없이 시세 페이지로 바로 이동', path: '/markets/crypto/futures/usdt-m', groups: [] },
  { id: 'spot', ko: '현물', en: 'Spot', desc: '코인을 쉽게 사고파는 거래', path: '/exchange/BTC_USDT', groups: [
    { items: [
      ['현물 거래', 'Spot', '코인을 쉽게 사고팔기', '/exchange/BTC_USDT'],
      ['리얼스톡', 'RealStocks', '미국 주요 주식을 코인으로 직접 거래', '/trade-stocks', 'badge'],
      ['간편 교환', 'Convert', '인기 토큰을 수수료 0으로 즉시 교환', '/convert'],
      ['프리마켓', 'Pre-Market', '정식 상장 전에 먼저 거래', '/pre-market'],
      ['MX 존', 'MX Zone', 'MX 보유자 전용 혜택', '/mx'],
      ['현물 DCA', 'Spot DCA', '등락과 관계없이 꾸준히 분할 매수', '/trading-bot/auto-timing'],
      ['현물 그리드', 'Spot Grid', '24시간 저점 매수·고점 매도 자동화', '/exchange/BTC_USDT?type=grid'],
      ['밈+', 'Meme+', '온체인 유망 토큰을 일찍 발굴', '/memecoin'],
      ['온체인', 'On-Chain', '온체인 자산의 발굴·거래·관리를 한곳에서', '/dex/onchain', 'badge'],
    ] },
  ] },
  { id: 'futures', ko: '선물', en: 'Futures', desc: '무기한 선물과 전통 자산 선물', path: '/futures/BTC_USDT', tag: 'BTC', groups: [
    { ko: '거래', en: 'Trade', items: [
      ['USDT 마진', 'USDT-M', 'USDT로 정산하는 무기한 선물', '/futures/BTC_USDT?type=linear_swap'],
      ['USDC 마진', 'USDC-M', 'USDC로 정산하는 무기한 선물', '/futures/BTC_USDC'],
      ['USD1 마진', 'USD1-M', 'USD1으로 정산하는 무기한 선물', '/futures/BTC_USD1'],
      ['코인 마진', 'Coin-M', '다른 코인으로 정산하는 무기한 선물', '/futures/coin-m/BTC_USD?type=swap'],
      ['선물 언', 'Futures Earn', '선물 자금으로 최대 연 20% 수익', '/futures-earn-staking?hide=1'],
      ['AI 전략', 'AI Strategy', '아이디어를 전략 실행으로 전환', '/futures/BTC_USDT?tab=ai', 'new'],
      ['그리드 거래', 'Grid Trading', '자동 거래로 변동성 활용', '/futures/trading-bots/grid/BTC_USDT'],
      ['카피 트레이드 × AI', 'Copy Trade × AI', '숙련 트레이더를 따라 하거나 AI로 전략 수립', '/futures/copyTrade/home'],
      ['모의 거래', 'Demo Trading', '위험 없이 선물 거래 연습', '/demo-trading'],
      ['선물 개요', 'Futures Overview', '선물 도구·상품·기능 살펴보기', '/futures'],
    ] },
    { ko: '인기 전통 자산', en: 'Trending TradFi', items: [
      ['금 선물', 'GOLD Futures', '24시간 높은 유동성과 레버리지', '/futures/XAU_USDT'],
      ['원유 선물', 'OIL Futures', '24시간 높은 유동성과 레버리지 거래', '/futures/USOIL_USDT'],
      ['은 선물', 'SILVER Futures', '수수료 0, 높은 유동성, 유연한 레버리지', '/futures/SILVER_USDT'],
    ] },
    { ko: '인기 코인', en: 'Trending Crypto', items: [
      ['BTC 선물', 'BTC Futures', '시장 최저 수준 수수료와 높은 레버리지', '/futures/BTC_USDT', 'hot'],
      ['ETH 선물', 'ETH Futures', '시장 최저 수준 수수료와 높은 레버리지', '/futures/ETH_USDT', 'hot'],
      ['ZEC 선물 서지', 'ZEC Futures Surge', '수수료 0, 최대 150배 레버리지, 21배 이상에서 최고 포지션 한도', '/futures/ZEC_USDT'],
    ] },
  ] },
  { id: 'earn', ko: '언', en: 'Earn', desc: '최대 연 600% 수익 홍보', path: '/staking', groups: [
    { items: [
      ['자유 예치', 'Flexible Earn', '보유 코인으로 높은 연이율 수익', '/earn'],
      ['보유 수익', 'Hold and Earn', '자산을 보유하면 매일 이자 지급', '/earn/auto-earn'],
      ['선물 언', 'Futures Earn', '잔고로 수익을 얻고 거래할수록 연이율 상승', '/earn/futures-auto-earn', 'badge'],
      ['온체인 언', 'On-Chain Earn', '쉬운 스테이킹, 실제 온체인 수익', '/earn/on-chain-staking'],
      ['담보 대출', 'Loans', '경쟁력 있는 금리로 즉시 대출', '/mx-activity/loan', 'badge'],
    ] },
  ] },
  { id: 'events', ko: '이벤트 센터', en: 'Event Center', desc: '수수료 0에 더 높은 보상', path: '/event-center/futures', groups: [
    { ko: '인기', en: 'Hot', items: [
      ['리워드 허브', 'Rewards Hub', '시작 보너스 10,000달러', '/rewards-hub'],
      ['이벤트 센터', 'Event Center', '더 높은 보상, 수수료 0', '/event-center/futures'],
      ['친구 초대 수익', 'Invite and Earn', '친구 1명당 140 USDT', '/invite/activity-invite?handleDefaultLocale=keep'],
    ] },
    { ko: '현물', en: 'Spot', items: [
      ['Anthropic 프리 IPO 히트웨이브', 'Anthropic Pre-IPO Heatwave', 'ANTHROPIC(PRE), NVIDIA H200 GPU 등 경품', '/events/star/Anthropic'],
      ['중간선거 마켓 러시', 'Midterm Market Rush', '전통 자산 거래로 50만 달러 나눔', '/events/star/Midterm-Market-Rush'],
      ['런치패드', 'Launchpad', '유망 토큰을 일찍 또는 할인가로', '/launchpad'],
      ['에어드롭+', 'Airdrop+', '입금·거래하고 신규 에어드롭 받기', '/token-airdrop', 'badge'],
      ['킥스타터', 'Kickstarter', 'MX를 보유하고 신규 토큰 받기', '/sun/assessment'],
      ['리얼스톡 수익률 순위', 'RealStocks PNL Rate Leaderboard', '100달러 거래로 최대 1만 달러 주식 보상', '/events/stocks/6'],
    ] },
    { ko: '선물', en: 'Futures', items: [
      ['수수료 0', '0 Fees', '인기 선물을 기간 한정 수수료 0으로', '/zero-fee'],
      ['선물 M-데이', 'Futures M-Day', '선물 거래하고 매일 보상 받기', '/futures-mday'],
      ['선물 손실 보전 플랜', 'Futures Loss Coverage Plan', '3중 보호와 5,000달러 상당 XAUT 경품', '/futures-activity/trading-protection'],
    ] },
  ] },
  { id: 'rewards', ko: '리워드 허브', en: 'Rewards Hub', desc: '시작 보너스 10,000달러. 하위 메뉴 없이 바로 이동', path: '/rewards-hub', groups: [] },
  { id: 'more', ko: '더보기', en: 'More', desc: '제휴·정보·기관 서비스 모음', groups: [
    { items: [
      ['추천 프로그램', 'Referral Program', '친구 초대로 40%부터 수수료 환급', '/invite', 'hot'],
      ['제휴 프로그램', 'Affiliate Program', '최대 70% 제휴 수수료', '/affiliate'],
      ['VVIP', 'VVIP', 'M-Score를 자산으로, 10가지 이상 혜택', '/user/m-score', 'hot'],
      ['트레이딩뷰 연동', 'TradingView', '트레이딩뷰 연동 안내', '/trading-view'],
      ['코인 뉴스', 'Crypto News', '최신 코인 소식', '/news'],
      ['공지사항', 'Announcements', '사이트 소식 확인', '/support/categories/360000254192'],
      ['배우기', 'Learn', '입문자를 위한 코인 기초', '/learn'],
      ['기관 서비스', 'Institutional', '기관 고객 맞춤 솔루션', '/institutional-services'],
    ] },
  ] },
];

// 헤더 오른쪽 도구. 원본의 검색창은 코인 검색이고, 여기서는 메뉴 검색으로 바꿨다
const UTILITY = [
  ['로그인', 'Log In', '/login'],
  ['회원가입', 'Sign Up', '/register'],
  ['앱 다운로드', 'Download', '/download'],
];

// 375px 원본 화면의 하단 탭
const MOBILE_TABS = [['홈', 'Home', '/'], ['시장', 'Markets', '/markets/crypto/futures/usdt-m'], ['거래', 'Trade', '/exchange/BTC_USDT'], ['선물', 'Futures', '/futures/BTC_USDT'], ['자산', 'Assets', '/assets']];

// 푸터 항목. sub가 있으면 원본에서 접힌 묶음이다
const FOOTER = [
  { ko: '소개', en: 'About', items: [
    ['사이트 소개', 'About', '/about'],
    ['이 사이트를 쓰는 이유', 'Why', '/why-mexc'],
    ['신뢰 증명', 'Proof of Trust', '/Proof_of_Trust'],
    ['공식 채널 확인', 'Verify', '/official-verify'],
    ['커뮤니티', 'Community', '/community'],
    ['이벤트 지도', 'Event Map', '/crypto-events-map'],
    ['벤처스', 'Ventures', '/ventures'],
    ['재단', 'Foundation', '/foundation'],
    { ko: '문의하기', en: 'Contact Us', sub: [
      ['사업 제휴', 'Business', '/contact/business'],
      ['기관', 'Institution', '/contact/institution'],
      ['미디어', 'Media', '/contact/media'],
      ['콘텐츠 협업', 'Content Collaboration', '/contact/content'],
      ['부정행위 신고', 'Report Misconduct', '/announcements/article/17827791534301'],
    ] },
    ['브랜드 가이드라인', 'Brand Guidelines', '/brand-guidelines'],
  ] },
  { ko: '상품', en: 'Products', items: [
    ['수수료 0', '0 Fees', '/zero-fee'],
    { ko: '현물', en: 'Spot', sub: [
      ['밈+', 'Meme+', '/memecoin'],
      ['런치패드', 'Launchpad', '/launchpad'],
    ] },
    { ko: '선물', en: 'Futures', sub: [
      ['선물 그리드 봇', 'Futures Grid Bot', '/futures/trading-bots/grid'],
      ['이벤트 선물', 'Event Futures', '/futures/prediction-futures'],
      ['주식 선물', 'Stock Futures', '/futures/stock-futures'],
    ] },
    ['온체인', 'On-Chain', '/dex'],
    ['코인 구매', 'Buy Crypto', '/buy-crypto'],
    ['P2P', 'P2P', '/buy-crypto/p2p'],
    ['간편 교환', 'Convert', '/convert'],
    ['프리마켓', 'Pre-Market', '/pre-market'],
    ['리얼스톡', 'RealStocks', '/trade-stocks'],
    ['현물 그리드', 'Spot Grid', '/exchange/BTC_USDT?type=grid'],
    ['DCA', 'DCA', '/trading-bot/auto-timing'],
    ['카피 트레이드', 'Copy Trade', '/futures/copyTrade/home'],
    ['모의 거래', 'Demo Trading', '/demo-trading'],
    ['언', 'Earn', '/staking'],
    ['대출', 'Loans', '/mx-activity/loan'],
    ['거래 수수료', 'Trading Fees', '/fee'],
    ['AI 도구', 'AI', '/mexc-ai'],
    ['트레이딩뷰', 'TradingView', '/trading-view'],
  ] },
  { ko: '파트너십', en: 'Partnerships', items: [
    ['제휴 프로그램', 'Affiliate Program', '/affiliate'],
    ['추천 프로그램', 'Referral Program', '/invite'],
    ['P2P 머천트 프로그램', 'P2P Merchant Program', '/buy-crypto/apply-merchant'],
    ['상장 신청', 'Listing Application', '/token-listing-apply'],
    ['기관 서비스', 'Institutional Services', '/activity/institution'],
    ['API 서비스', 'API Services', '/mexc-api'],
    ['파트너 링크', 'Partner Links', '/links'],
  ] },
  { ko: '자료', en: 'Resources', items: [
    ['고객센터', 'Help Center', '/support'],
    ['실시간 상담', 'Live Support', '/support/live'],
    ['문의 접수', 'Submit a Ticket', '/support/requests'],
    ['공지 센터', 'Announcement Center', '/announcements'],
    ['알파 트레이더', 'Alpha Trader', '/alpha-trader'],
    ['배우기', 'Learn', '/learn'],
    ['블로그', 'Blog', '/blog'],
    ['코인 뉴스', 'Crypto News', '/news'],
    { ko: '전체 코인 시세', en: 'All Crypto Prices', sub: [
      ['전체 코인 시세', 'All Crypto Prices', '/price'],
      ['비트코인 시세', 'Bitcoin Price', '/price/BTC'],
      ['이더리움 시세', 'Ethereum Price', '/price/ETH'],
      ['도지코인 시세', 'Dogecoin Price', '/price/DOGE'],
      ['리플 시세', 'Ripple Price', '/price/XRP'],
      ['솔라나 시세', 'Solana Price', '/price/SOL'],
      ['카르다노 시세', 'Cardano Price', '/price/ADA'],
      ['트론 시세', 'TRX Price', '/price/TRX'],
      ['아발란체 시세', 'AVAX Price', '/price/AVAX'],
      ['라이트코인 시세', 'Litecoin Price', '/price/LTC'],
      ['페페 시세', 'PEPE Price', '/price/PEPE'],
      ['MX 토큰 시세', 'MX Token Price', '/price/MX'],
    ] },
    { ko: '구매 방법', en: 'How to Buy', sub: [
      ['코인 구매 방법', 'How to buy Crypto', '/how-to-buy'],
      ['비트코인 구매', 'Buy Bitcoin', '/how-to-buy/BTC'],
      ['이더리움 구매', 'Buy Ethereum', '/how-to-buy/ETH'],
      ['도지코인 구매', 'Buy Dogecoin', '/how-to-buy/DOGE'],
      ['리플 구매', 'Buy Ripple', '/how-to-buy/XRP'],
      ['솔라나 구매', 'Buy SOL', '/how-to-buy/SOL'],
      ['MX 토큰 구매', 'Buy MX Token', '/how-to-buy/MX'],
    ] },
    ['코인 환산기', 'Crypto Converter', '/price/BTC/USD'],
    ['의견 보내기', 'Give Feedback', '/support/requests/suggestion'],
    ['사이트맵', 'Sitemap', '/sitemap/crypto/price'],
    { ko: '코인 세금', en: 'Crypto Tax', sub: [
      ['코인 세금 계산기', 'Crypto Tax Calculator', '/tools/crypto-tax-calculator'],
      ['호주 세금 계산기', 'AU Tax Calculator', '/tools/crypto-tax-calculator/au'],
      ['인도 세금 계산기', 'IN Tax Calculator', '/tools/crypto-tax-calculator/in'],
      ['영국 세금 계산기', 'UK Tax Calculator', '/tools/crypto-tax-calculator/uk'],
      ['코인 세금 연동', 'Crypto Tax Integrations', '/tools/crypto-tax-calculator/integrations'],
    ] },
    { ko: '주식 정보', en: 'Stocks Info', sub: [
      ['주식 정보', 'Stocks Info', '/stocks'],
      ['엔비디아 주가', 'NVDA Stock Price', '/stocks/nvda'],
      ['애플 주가', 'AAPL Stock Price', '/stocks/aapl'],
      ['테슬라 주가', 'TSLA Stock Price', '/stocks/tsla'],
      ['구글 주가', 'GOOGL Stock Price', '/stocks/googl'],
      ['마이크로소프트 주가', 'MSFT Stock Price', '/stocks/msft'],
    ] },
  ] },
  { ko: '법률 및 규정', en: 'Legal & Compliance', items: [
    ['이용약관', 'User Agreement', '/terms'],
    ['개인정보 처리방침', 'Privacy Policy', '/privacypolicy'],
    ['위험 고지', 'Risk Disclosure', '/risk'],
    ['이상 자금 신고', 'Report Abnormal Funds', '/support/ticket/submit/report-abnormal-funds'],
    ['장외거래 상담', 'OTC Consultation', '/support/ticket/submit/otc-consultation'],
    ['수사기관 협조', 'Judicial Assistance', '/support/ticket/submit/law-enforcement-requests'],
  ] },
];

// 같은 기능이 다른 경로로 연결되는 지점. 메뉴 데이터를 직접 비교해 찾았다
const FINDINGS = [
  ['선물 언', '헤더 안에서만 두 경로로 갈립니다.', ['/futures-earn-staking', '/earn/futures-auto-earn']],
  ['언', '상단 메뉴와 푸터는 스테이킹으로, 하위 항목은 언 페이지로 갑니다.', ['/staking', '/earn']],
  ['공지', '헤더의 공지사항과 푸터의 공지 센터가 서로 다른 주소입니다.', ['/support/categories/360000254192', '/announcements']],
  ['온체인', '헤더와 푸터의 도착지가 다릅니다.', ['/dex/onchain', '/dex']],
  ['기관 서비스', '헤더와 푸터의 기관 서비스가 다른 주소입니다.', ['/institutional-services', '/activity/institution']],
];
