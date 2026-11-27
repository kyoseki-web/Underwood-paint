// =========================================================
// 自動見積もり
//  ★単価はすべて仮の値です。実際の金額に書き換えてください。
//  ここを変えると、計算結果と「料金表」の両方に反映されます。
// =========================================================
const PRICE = {
  grades: {                          // 塗料のグレード（1㎡あたり・3回塗り）
    silicon: { name: 'シリコン',  life: '10〜13年', wall: 2800, roof: 2600 },
    radical: { name: 'ラジカル',  life: '12〜15年', wall: 3000, roof: 2800 },
    fluorine:{ name: 'フッ素',    life: '15〜20年', wall: 4200, roof: 4000 },
    inorganic:{name: '無機',      life: '20〜25年', wall: 5000, roof: 4800 },
  },
  scaffold: 800,        // 足場（組立・解体・飛散防止ネット） 1㎡
  wash: 200,            // 高圧洗浄 1㎡
  masking: 300,         // 養生 1㎡（外壁）
  sealing: 1000,        // シーリング打ち替え 1m
  trim: 900,            // 付帯部（雨樋・破風・軒天など） 延床1㎡あたり
  balcony: 50000,       // ベランダ防水トップコート 一式
  interior: {           // 内装 1㎡
    standard: { name: '一般（水性）', price: 1300 },
    func:     { name: '防カビ・消臭', price: 1800 },
  },
  roomPrep: 15000,      // 内装の養生・家具移動 1部屋
  overhead: 0.05,       // 諸経費
  tax: 0.10,
  spread: 0.10,         // 目安の幅（±10%）
};

// 建物の大きさから面積を出すための係数（一般的な目安）
const TSUBO = 3.3058;   // 1坪 = 3.3058㎡
const JO = 1.62;        // 1畳 = 約1.62㎡
const WALL_RATE = 1.2;  // 外壁面積 ≒ 延床面積 × 1.2
const SCAFFOLD_RATE = 1.7; // 足場面積 ≒ 外壁面積 × 1.7
const ROOF_RATE = 1.25; // 屋根面積 ≒ 1階の床面積 × 1.25（軒の出を含む）

const yen = n => Math.round(n).toLocaleString('ja-JP');
const man = n => Math.round(n / 10000).toLocaleString('ja-JP');

function calc(v) {
  const rows = [];
  if (v.type === 'interior') {
    const floor = v.jo * JO;
    const side = Math.sqrt(floor);
    const wall = side * 4 * 2.4 * 0.8;           // 天井高2.4m、窓やドア分を2割引く
    const area = (wall + (v.ceiling ? floor : 0)) * v.rooms;
    const g = PRICE.interior[v.igrade];
    rows.push([`内装塗装（${g.name}・約${Math.round(area)}㎡）`, area * g.price]);
    rows.push([`養生・家具移動（${v.rooms}部屋）`, PRICE.roomPrep * v.rooms]);
  } else {
    const floor = v.tsubo * TSUBO;
    const wall = floor * WALL_RATE;
    const roof = floor / v.stories * ROOF_RATE;
    const g = PRICE.grades[v.grade];
    const doWall = v.type !== 'roof', doRoof = v.type !== 'wall';
    rows.push([`足場（約${Math.round(wall * SCAFFOLD_RATE)}㎡）`, wall * SCAFFOLD_RATE * PRICE.scaffold]);
    rows.push(['高圧洗浄', ((doWall ? wall : 0) + (doRoof ? roof : 0)) * PRICE.wash]);
    if (doWall) {
      rows.push(['養生', wall * PRICE.masking]);
      rows.push([`外壁塗装（${g.name}・約${Math.round(wall)}㎡）`, wall * g.wall]);
    }
    if (doRoof) rows.push([`屋根塗装（${g.name}・約${Math.round(roof)}㎡）`, roof * g.roof]);
    if (v.sealing && doWall) rows.push(['シーリング打ち替え', wall * 1.4 * PRICE.sealing]);
    if (v.trim) rows.push(['付帯部塗装（雨樋・破風など）', floor * PRICE.trim]);
    if (v.balcony) rows.push(['ベランダ防水', PRICE.balcony]);
  }
  const sub = rows.reduce((s, r) => s + r[1], 0);
  rows.push(['諸経費', sub * PRICE.overhead]);
  const total = rows.reduce((s, r) => s + r[1], 0) * (1 + PRICE.tax);
  return { rows, low: total * (1 - PRICE.spread), high: total * (1 + PRICE.spread) };
}

(() => {
  const form = document.getElementById('est-form');
  if (!form) return;
  const $ = s => document.querySelector(s);

  const read = () => ({
    type: form.type.value,
    tsubo: +form.tsubo.value,
    stories: +form.stories.value,
    grade: form.grade.value,
    sealing: form.sealing.checked,
    trim: form.trim.checked,
    balcony: form.balcony.checked,
    rooms: +form.rooms.value,
    jo: +form.jo.value,
    ceiling: form.ceiling.checked,
    igrade: form.igrade.value,
  });

  const typeName = { wall: '外壁塗装', roof: '屋根塗装', both: '外壁＋屋根塗装', interior: '内装塗装' };

  const update = () => {
    const v = read();
    const interior = v.type === 'interior';
    document.querySelectorAll('[data-for="exterior"]').forEach(el => el.hidden = interior);
    document.querySelectorAll('[data-for="interior"]').forEach(el => el.hidden = !interior);
    $('#sealing-wrap').hidden = interior || v.type === 'roof';
    $('#tsubo-out').value = `${v.tsubo}坪`;
    $('#rooms-out').value = `${v.rooms}部屋`;

    const r = calc(v);
    $('#total').innerHTML = `${man(r.low)}〜${man(r.high)}<small>万円（税込）</small>`;
    $('#rows').innerHTML = r.rows.map(([k, n]) => `<tr><td>${k}</td><td>${yen(n)}円</td></tr>`).join('');
    form.dataset.summary =
      `工事内容：${typeName[v.type]}\n` +
      (interior
        ? `部屋：${v.jo}畳 × ${v.rooms}部屋（${v.ceiling ? '壁と天井' : '壁のみ'}）\n塗料：${PRICE.interior[v.igrade].name}\n`
        : `延床面積：${v.tsubo}坪／${v.stories}階建て\n塗料：${PRICE.grades[v.grade].name}\n` +
          `オプション：${[v.sealing && v.type !== 'roof' && 'シーリング打ち替え', v.trim && '付帯部', v.balcony && 'ベランダ防水'].filter(Boolean).join('、') || 'なし'}\n`) +
      `目安：${man(r.low)}〜${man(r.high)}万円（税込）`;
  };

  form.addEventListener('input', update);
  update();

  $('#to-contact').addEventListener('click', () => {
    try {
      localStorage.setItem('uw-estimate', JSON.stringify({
        type: form.type.value === 'interior' ? '内装塗装' : form.type.value === 'roof' ? '屋根塗装' : '外壁塗装',
        summary: form.dataset.summary,
      }));
    } catch (e) { /* 保存が使えなくてもページ移動はする */ }
    location.href = 'contact.html';
  });

  // 料金表（単価一覧）を同じ設定から作る
  const g = Object.values(PRICE.grades);
  $('#price-grades').innerHTML = g.map(x =>
    `<tr><td>${x.name}</td><td>${x.life}</td><td class="num">${yen(x.wall)}円</td><td class="num">${yen(x.roof)}円</td></tr>`).join('');
  $('#price-others').innerHTML = [
    ['足場（組立・解体・飛散防止ネット）', `${yen(PRICE.scaffold)}円／㎡`],
    ['高圧洗浄', `${yen(PRICE.wash)}円／㎡`],
    ['養生', `${yen(PRICE.masking)}円／㎡`],
    ['シーリング打ち替え', `${yen(PRICE.sealing)}円／m`],
    ['ベランダ防水（トップコート）', `${yen(PRICE.balcony)}円／一式`],
    [`内装塗装（${PRICE.interior.standard.name}）`, `${yen(PRICE.interior.standard.price)}円／㎡`],
    [`内装塗装（${PRICE.interior.func.name}）`, `${yen(PRICE.interior.func.price)}円／㎡`],
  ].map(([k, p]) => `<tr><td>${k}</td><td class="num">${p}</td></tr>`).join('');
})();
