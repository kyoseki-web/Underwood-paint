// =========================================================
// UnderWood Laboratory — 共通スクリプト
// =========================================================

// スマホのメニュー開閉
(() => {
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? '閉じる' : 'メニュー';
  });
})();

// 施工実績の絞り込み
(() => {
  const bar = document.querySelector('.filters');
  if (!bar) return;
  const items = [...document.querySelectorAll('.work')];
  bar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    bar.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    const cat = b.dataset.cat;
    items.forEach(it => { it.hidden = cat !== 'all' && it.dataset.cat !== cat; });
  });
})();

// お問い合わせフォーム
//  公開するときは <form data-endpoint="https://formspree.io/f/xxxx"> のように
//  送信先（Formspreeなど）のURLを入れてください。空のあいだは送信しません。
(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const msg = document.getElementById('form-msg');
  const show = (text, type) => { msg.hidden = false; msg.dataset.type = type; msg.textContent = text; msg.focus(); };

  // 見積もりページから来たときは内容を引き継ぐ
  try {
    const est = JSON.parse(localStorage.getItem('uw-estimate') || 'null');
    if (est) {
      form.type.value = est.type;
      form.message.value = `【自動見積もりの内容】\n${est.summary}\n\n`;
      localStorage.removeItem('uw-estimate');
    }
  } catch (e) { /* 保存が使えない環境では何もしない */ }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      show('送信先がまだ設定されていません。お急ぎの方はお電話でご連絡ください。', 'error');
      return;
    }
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error();
      form.reset();
      show('送信しました。2営業日以内にご連絡します。', 'ok');
    } catch {
      show('送信できませんでした。通信状況を確認して、もう一度送信してください。', 'error');
    }
  });
})();
