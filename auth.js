/**
 * WebBuilder — Auth System v4
 * ✓ Russian text: navbar uses clamp() — font shrinks, bar stays same height
 * ✓ Renamed to "WebBuilder" (no Pro) everywhere
 * ✓ All 3 languages fully translated (RO/EN/RU)
 * ✓ Login/Register inside mobile hamburger menu (3-line icon)
 * ✓ Language-change re-renders all auth UI instantly
 * ✓ "My Orders" → links to payment.html (shows all orders)
 * ✓ Auto-fills order form when logged in
 */
(function () {
'use strict';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRANSLATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AT = {
  ro: {
    btnGuest:'Cont', logout:'Deconectare',
    loginTitle:'Bine ai revenit!', loginSub:'Loghează-te pentru comenzile tale',
    regTitle:'Creează cont', regSub:'Înregistrare gratuită',
    lName:'Numele tău', lEmail:'Email', lPass:'Parolă', lPhone:'Telefon (opțional)',
    loginBtn:'Loghează-te', regBtn:'Creează cont',
    noAcc:'Nu ai cont?', hasAcc:'Ai deja cont?',
    toReg:'Înregistrează-te', toLogin:'Loghează-te',
    hello:'Salut', myOrders:'Comenzile mele',
    signing:'Se conectează…', creating:'Se creează…',
    errPass:'Parolă incorectă.', errNoUser:'Nu există cont cu acest email.',
    errInUse:'Emailul este deja folosit.', errWeak:'Parola trebuie min. 6 caractere.',
    errEmail:'Email invalid.', errGen:'Eroare. Încearcă din nou.',
    filled:'Date completate automat ✓',
    mobSection:'CONT', mobLogin:'Loghează-te / Înregistrează-te',
    mobAs:'Conectat ca', mobOrders:'Comenzile Mele', mobOut:'Deconectare',
    rules:'Regulament', rulesTitle:'Regulament & Condiții',
    rulesSubtitle:'Te rugăm să citești cu atenție înainte de a plasa o comandă',
  },
  en: {
    btnGuest:'Account', logout:'Sign Out',
    loginTitle:'Welcome back!', loginSub:'Sign in to track your orders',
    regTitle:'Create account', regSub:'Register for free',
    lName:'Your name', lEmail:'Email', lPass:'Password', lPhone:'Phone (optional)',
    loginBtn:'Sign In', regBtn:'Create Account',
    noAcc:"Don't have an account?", hasAcc:'Already have an account?',
    toReg:'Register', toLogin:'Sign In',
    hello:'Hello', myOrders:'My Orders',
    signing:'Signing in…', creating:'Creating…',
    errPass:'Incorrect password.', errNoUser:'No account with this email.',
    errInUse:'Email already in use.', errWeak:'Password must be 6+ characters.',
    errEmail:'Invalid email.', errGen:'Error. Please try again.',
    filled:'Details auto-filled ✓',
    mobSection:'ACCOUNT', mobLogin:'Sign In / Register',
    mobAs:'Signed in as', mobOrders:'My Orders', mobOut:'Sign Out',
    rules:'Rules', rulesTitle:'Terms & Rules',
    rulesSubtitle:'Please read carefully before placing an order',
  },
  ru: {
    btnGuest:'Войти', logout:'Выйти',
    loginTitle:'С возвращением!', loginSub:'Войдите для отслеживания заказов',
    regTitle:'Создать аккаунт', regSub:'Регистрация бесплатна',
    lName:'Ваше имя', lEmail:'Email', lPass:'Пароль', lPhone:'Телефон (необяз.)',
    loginBtn:'Войти', regBtn:'Создать',
    noAcc:'Нет аккаунта?', hasAcc:'Уже есть аккаунт?',
    toReg:'Регистрация', toLogin:'Войти',
    hello:'Привет', myOrders:'Мои заказы',
    signing:'Вход…', creating:'Создание…',
    errPass:'Неверный пароль.', errNoUser:'Аккаунт не найден.',
    errInUse:'Email уже используется.', errWeak:'Пароль минимум 6 символов.',
    errEmail:'Неверный email.', errGen:'Ошибка. Попробуйте снова.',
    filled:'Данные заполнены ✓',
    mobSection:'АККАУНТ', mobLogin:'Войти / Регистрация',
    mobAs:'Вошли как', mobOrders:'Мои заказы', mobOut:'Выйти',
    rules:'Правила', rulesTitle:'Условия и правила',
    rulesSubtitle:'Пожалуйста, прочитайте внимательно перед оформлением заказа',
  }
};
function t(k) {
  const lang = localStorage.getItem('preferred-language') || 'en';
  return (AT[lang] || AT.en)[k] || k;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _auth = null, _db = null;
let currentUser = null, userProfile = {};
let isRegMode = false, modalOpen = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FIREBASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initAuth() {
  try {
    if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') return;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _auth = firebase.auth();
    _db = firebase.firestore();
    _auth.onAuthStateChanged(user => {
      currentUser = user;
      if (user) loadUserProfile(user);
      else { userProfile = {}; localStorage.removeItem('wbp_user'); renderAll(); }
    });
  } catch(e) { console.warn('Auth init:', e); }
}

async function loadUserProfile(user) {
  if (_db) {
    try {
      const doc = await _db.collection('users').doc(user.uid).get();
      userProfile = doc.exists ? doc.data() : {};
    } catch(e) { userProfile = {}; }
  }
  const name = userProfile.displayName || user.displayName || user.email.split('@')[0];
  localStorage.setItem('wbp_user', JSON.stringify({
    uid: user.uid, email: user.email,
    displayName: name, phone: userProfile.phone || ''
  }));
  renderAll();
  tryAutofillForm();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CSS
// Key fix: font-size uses clamp() — Russian Cyrillic is wider per char,
// clamp ensures the pill/button never breaks the nav height.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function injectStyles() {
  const s = document.createElement('style');
  s.id = 'auth-styles';
  s.textContent = `
  /* ── Nav wrap ── */
  #auth-nav-wrap {
    display: flex; align-items: center;
    margin-left: 10px; position: relative; flex-shrink: 0; min-width: 0;
  }
  /* Hidden on mobile — shown inside hamburger menu */
  @media (max-width: 900px) { #auth-nav-wrap { display: none !important; } }

  /* ── Guest button ──
     clamp(min, preferred, max) keeps Russian short words from expanding layout */
  .auth-btn-guest {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 22px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white; font-weight: 700; border: none; cursor: pointer;
    font-family: inherit; white-space: nowrap; transition: all .2s;
    box-shadow: 0 2px 10px rgba(59,130,246,.3);
    font-size: clamp(0.68rem, 1.1vw, 0.85rem);
    max-width: 130px; overflow: hidden; text-overflow: ellipsis;
  }
  .auth-btn-guest:hover { opacity:.9; transform:translateY(-1px); }

  /* ── Logged-in pill ── */
  .auth-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px 4px 4px; border-radius: 22px;
    background: rgba(59,130,246,.08); border: 1.5px solid rgba(59,130,246,.2);
    cursor: pointer; transition: background .18s; position: relative;
    max-width: 200px; min-width: 0;
  }
  .auth-pill:hover { background: rgba(59,130,246,.14); }
  .auth-pill-av {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: .72rem; font-weight: 800;
  }
  .auth-pill-name {
    font-size: clamp(0.65rem, 1.05vw, 0.8rem);
    font-weight: 600; color: #1e293b;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    min-width: 0; flex: 1; max-width: 95px;
  }
  .auth-pill-chev { font-size: .58rem; color: #94a3b8; flex-shrink: 0; }

  /* ── Dropdown ── */
  .auth-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: white; border-radius: 14px; min-width: 195px;
    box-shadow: 0 12px 40px rgba(0,0,0,.14);
    border: 1px solid #e2e8f0; overflow: hidden;
    display: none; z-index: 2001;
  }
  .auth-dropdown.open { display: block; animation: authDrop .16s ease; }
  @keyframes authDrop { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
  .auth-dd-item {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 16px; font-size: .84rem; font-weight: 500; color: #1e293b;
    cursor: pointer; transition: background .12s;
    border: none; background: none; width: 100%; text-align: left;
    font-family: inherit; text-decoration: none;
  }
  .auth-dd-item:hover { background: #f8fafc; }
  .auth-dd-item.danger { color: #ef4444; }
  .auth-dd-item i { width: 16px; text-align: center; opacity: .65; }
  .auth-dd-sep { height: 1px; background: #f1f5f9; margin: 3px 0; }

  /* ── Modal ── */
  #auth-modal-bg {
    position: fixed; inset: 0; background: rgba(15,23,42,.52);
    backdrop-filter: blur(6px); z-index: 9995;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    opacity: 0; pointer-events: none; transition: opacity .22s;
  }
  #auth-modal-bg.open { opacity:1; pointer-events: all; }
  .auth-modal {
    background: white; border-radius: 22px; width: 100%; max-width: 390px;
    box-shadow: 0 30px 80px rgba(0,0,0,.22); overflow: hidden;
    transform: scale(.95) translateY(8px); transition: transform .22s ease;
  }
  #auth-modal-bg.open .auth-modal { transform: scale(1) translateY(0); }
  .auth-modal-head {
    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
    padding: 24px 24px 18px; color: white; text-align: center; position: relative;
  }
  .auth-modal-head h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 3px; }
  .auth-modal-head p { font-size: .78rem; opacity: .85; margin: 0; }
  .auth-modal-close {
    position: absolute; top: 12px; right: 12px;
    background: rgba(255,255,255,.18); border: none; color: white;
    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
    font-size: .76rem; display: flex; align-items: center; justify-content: center;
  }
  .auth-modal-close:hover { background: rgba(255,255,255,.32); }
  .auth-modal-body { padding: 20px 22px 24px; }
  .auth-field { margin-bottom: 12px; }
  .auth-field label {
    display: block; font-size: .7rem; font-weight: 700;
    color: #64748b; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 5px;
  }
  .auth-field input {
    width: 100%; padding: 10px 13px; border: 2px solid #e2e8f0; border-radius: 10px;
    font-family: inherit; font-size: .88rem; color: #1e293b;
    outline: none; transition: border-color .18s;
  }
  .auth-field input:focus { border-color: #3b82f6; }
  .auth-submit-btn {
    width: 100%; padding: 12px;
    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
    color: white; border: none; border-radius: 10px;
    font-family: inherit; font-size: .92rem; font-weight: 700;
    cursor: pointer; transition: all .18s; margin-top: 4px;
  }
  .auth-submit-btn:hover { opacity:.9; transform:translateY(-1px); }
  .auth-submit-btn:disabled { opacity:.6; cursor:not-allowed; transform:none; }
  .auth-error {
    background: #fee2e2; color: #7f1d1d;
    padding: 8px 12px; border-radius: 8px; font-size: .8rem;
    margin-top: 9px; display: none;
  }
  .auth-switch { text-align: center; margin-top: 13px; font-size: .79rem; color: #64748b; }
  .auth-switch a { color: #3b82f6; font-weight: 700; cursor: pointer; }
  .auth-switch a:hover { text-decoration: underline; }

  /* ── Auto-fill notice ── */
  .auth-form-notice {
    background: rgba(16,185,129,.08); border: 1.5px solid rgba(16,185,129,.25);
    border-radius: 9px; padding: 8px 12px; font-size: .79rem; font-weight: 600;
    color: #065f46; display: none; margin-bottom: 10px;
    align-items: center; gap: 7px;
  }
  .auth-form-notice.show { display: flex; }

  /* ── Rules Modal ── */
  #rules-modal-bg {
    position: fixed; inset: 0; background: rgba(15,23,42,.52);
    backdrop-filter: blur(6px); z-index: 9999;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    opacity: 0; pointer-events: none; transition: opacity .22s;
  }
  #rules-modal-bg.open { opacity:1; pointer-events: all; }
  .rules-modal {
    background: white; border-radius: 22px; width: 100%; max-width: 560px;
    max-height: 90vh; display: flex; flex-direction: column;
    box-shadow: 0 30px 80px rgba(0,0,0,.22); overflow: hidden;
    transform: scale(.95) translateY(8px); transition: transform .22s ease;
  }
  #rules-modal-bg.open .rules-modal { transform: scale(1) translateY(0); }
  .rules-modal-head {
    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
    padding: 22px 24px 16px; color: white; text-align: center; position: relative; flex-shrink:0;
  }
  .rules-modal-head h3 { font-size: 1.15rem; font-weight: 800; margin-bottom: 3px; }
  .rules-modal-head p { font-size: .75rem; opacity: .85; margin: 0; }
  .rules-modal-close {
    position: absolute; top: 12px; right: 12px;
    background: rgba(255,255,255,.18); border: none; color: white;
    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
    font-size: .76rem; display: flex; align-items: center; justify-content: center;
  }
  .rules-modal-close:hover { background: rgba(255,255,255,.32); }
  .rules-modal-body { padding: 22px 24px; overflow-y: auto; flex:1; }
  .rules-section { margin-bottom: 20px; }
  .rules-section:last-child { margin-bottom: 0; }
  .rules-section h4 {
    font-size: .78rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: .6px; color: #6366f1; margin-bottom: 8px;
    display: flex; align-items: center; gap: 7px;
  }
  .rules-section h4 i { font-size: .8rem; }
  .rules-section p, .rules-section li {
    font-size: .84rem; color: #334155; line-height: 1.6; margin-bottom: 5px;
  }
  .rules-section ul { padding-left: 18px; margin: 0; }
  .rules-highlight {
    background: linear-gradient(135deg,rgba(99,102,241,.07),rgba(139,92,246,.07));
    border: 1.5px solid rgba(99,102,241,.2);
    border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;
    font-size: .85rem; color: #1e293b; line-height: 1.65;
  }
  .rules-highlight strong { color: #4f46e5; }
  .rules-badge-green {
    display: inline-block; background: #dcfce7; color: #15803d;
    font-size: .72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
    margin-left: 6px; vertical-align: middle;
  }
  .rules-badge-orange {
    display: inline-block; background: #fef3c7; color: #b45309;
    font-size: .72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
    margin-left: 6px; vertical-align: middle;
  }
  .rules-modal-footer {
    padding: 14px 24px; border-top: 1px solid #f1f5f9; flex-shrink:0;
    display: flex; justify-content: center;
  }
  .rules-ok-btn {
    padding: 10px 32px;
    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
    color: white; border: none; border-radius: 10px;
    font-family: inherit; font-size: .9rem; font-weight: 700;
    cursor: pointer; transition: all .18s;
  }
  .rules-ok-btn:hover { opacity:.9; transform:translateY(-1px); }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     MOBILE MENU AUTH SECTION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  .mob-auth-section {
    border-bottom: 1px solid rgba(0,0,0,.07);
    padding: 14px 0 14px; margin-bottom: 4px;
  }
  .mob-auth-label {
    font-size: .63rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: #1e293b; padding: 0 20px 8px; display: block;
  }
  .mob-auth-cta {
    display: flex; align-items: center; gap: 13px;
    padding: 12px 20px; background: none; border: none;
    color: #000; font-size: .95rem; font-weight: 800;
    cursor: pointer; font-family: inherit; width: 100%; text-align: left;
    transition: background .14s;
  }
  .mob-auth-cta:hover { background: rgba(59,130,246,.06); }
  .mob-auth-cta-icon {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: .9rem; color: white;
  }
  .mob-auth-user { padding: 0 16px 6px; }
  .mob-auth-chip {
    display: flex; align-items: center; gap: 10px;
    background: rgba(59,130,246,.06); border: 1px solid rgba(59,130,246,.12); border-radius: 12px;
    padding: 10px 14px; margin-bottom: 6px;
  }
  .mob-auth-av {
    width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg,#3b82f6,#8b5cf6);
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: .8rem; font-weight: 800;
  }
  .mob-auth-info { flex: 1; min-width: 0; }
  .mob-auth-info span:first-child { display: block; font-size: .62rem; color: #64748b; }
  .mob-auth-info span:last-child {
    display: block; font-size: .84rem; font-weight: 600; color: #1e293b;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mob-auth-link {
    display: flex; align-items: center; gap: 11px;
    padding: 10px 20px; background: none; border: none;
    color: #1e293b; font-size: .84rem; font-weight: 600;
    cursor: pointer; font-family: inherit; width: 100%;
    text-align: left; transition: all .14s; text-decoration: none;
  }
  .mob-auth-link:hover { color: #0f172a; background: rgba(59,130,246,.06); }
  .mob-auth-link.red { color: #f87171; }
  .mob-auth-link.red:hover { color: #ef4444; }
  .mob-auth-link i { width: 16px; text-align: center; font-size: .84rem; }
  `;
  document.head.appendChild(s);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUILD MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildModal() {
  const bg = document.createElement('div');
  bg.id = 'auth-modal-bg';
  bg.innerHTML = `
  <div class="auth-modal">
    <div class="auth-modal-head">
      <button class="auth-modal-close" onclick="authCloseModal()"><i class="fas fa-times"></i></button>
      <h3 id="auth-m-title"></h3>
      <p id="auth-m-sub"></p>
    </div>
    <div class="auth-modal-body">
      <div class="auth-form-notice" id="auth-form-notice">
        <i class="fas fa-check-circle"></i>
        <span id="auth-form-notice-text"></span>
      </div>
      <div class="auth-field" id="auth-name-field" style="display:none">
        <label id="auth-lbl-name"></label>
        <input type="text" id="auth-name-input" autocomplete="name">
      </div>
      <div class="auth-field">
        <label id="auth-lbl-email"></label>
        <input type="email" id="auth-email-input" autocomplete="email">
      </div>
      <div class="auth-field">
        <label id="auth-lbl-pass"></label>
        <input type="password" id="auth-pass-input" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div class="auth-field" id="auth-phone-field" style="display:none">
        <label id="auth-lbl-phone"></label>
        <input type="tel" id="auth-phone-input" autocomplete="tel">
      </div>
      <button class="auth-submit-btn" id="auth-submit-btn" onclick="authSubmit()"></button>
      <div class="auth-error" id="auth-error"></div>
      <div class="auth-switch">
        <span id="auth-switch-text"></span>
        <a onclick="authToggleMode()" id="auth-switch-link"></a>
      </div>
    </div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click', e => { if (e.target === bg) authCloseModal(); });
  ['auth-email-input','auth-pass-input','auth-name-input','auth-phone-input'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') authSubmit();
    });
  });
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULES MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const RULES = {
  ro: {
    payment: 'Plată & Proces',
    paymentText: `
      <div class="rules-highlight">
        🔒 <strong>20% avans</strong> — La plasarea comenzii, clientul plătește <strong>20%</strong> din prețul total al site-ului. Această sumă confirmă comanda și acoperă munca inițială de design și dezvoltare.
      </div>
      <ul>
        <li>După achitarea avansului de 20%, echipa noastră începe imediat lucrul la site.</li>
        <li>Când site-ul este gata, îl prezentăm clientului pentru aprobare.</li>
        <li>Dacă site-ul <strong>ÎȚI PLACE</strong><span class="rules-badge-green">✓ Aprobat</span>: plătești restul de <strong>80%</strong>, iar site-ul este publicat online.</li>
        <li>Dacă site-ul <strong>NU ÎȚI PLACE</strong><span class="rules-badge-orange">✗ Respins</span>: avansul de 20% nu se returnează — acesta acoperă munca depusă (design, cod, timp).</li>
      </ul>`,
    delivery: 'Timp de livrare',
    deliveryText: `<ul>
        <li><strong>Basic</strong>: 1–2 zile lucrătoare</li>
        <li><strong>Standard</strong>: 3–5 zile lucrătoare</li>
        <li><strong>Premium</strong>: 7–14 zile lucrătoare</li>
        <li>Termenele pot varia în funcție de complexitatea proiectului și disponibilitatea informațiilor furnizate de client.</li>
      </ul>`,
    revisions: 'Revizii & Modificări',
    revisionsText: `<ul>
        <li>Fiecare pachet include revizii gratuite în primele 30 de zile.</li>
        <li>Modificările ulterioare sunt disponibile prin planul de mentenanță: 1 modificare (€8), 5 modificări (€25), 12 modificări (€50).</li>
        <li>O „modificare" înseamnă o schimbare de conținut (text, imagine, culoare). Schimbările structurale majore pot conta ca modificări multiple.</li>
      </ul>`,
    content: 'Conținut & Materiale',
    contentText: `<ul>
        <li>Clientul este responsabil de furnizarea textelor, imaginilor și logo-ului în timp util.</li>
        <li>Dacă nu sunt furnizate materiale, vom folosi conținut demonstrativ (placeholder) care poate fi înlocuit ulterior.</li>
        <li>Toate materialele furnizate trebuie să fie deținute sau licențiate de client.</li>
      </ul>`,
    domain: 'Domeniu & Hosting',
    domainText: `<ul>
        <li>Hosting-ul (€4/lună) este opțional și poate fi achiziționat separat.</li>
        <li>Domeniul poate fi cumpărat de client direct de la <strong>GoDaddy</strong> sau <strong>Namecheap</strong>, sau prețul va fi comunicat la comandă.</li>
        <li>Publicarea site-ului se face după achitarea integrală (100%) a sumei.</li>
      </ul>`,
    general: 'Reguli Generale',
    generalText: `<ul>
        <li>Prin plasarea unei comenzi, clientul acceptă toți termenii și condițiile prezentate.</li>
        <li>WebBuilder își rezervă dreptul de a refuza proiecte cu conținut ilegal, ofensator sau care încalcă drepturile altor persoane.</li>
        <li>Comunicarea se face prin email, WhatsApp sau prin sistemul de chat din platformă.</li>
        <li>Orice litigiu se va rezolva pe cale amiabilă.</li>
      </ul>`,
    ok: 'Am înțeles',
  },
  en: {
    payment: 'Payment & Process',
    paymentText: `
      <div class="rules-highlight">
        🔒 <strong>20% upfront deposit</strong> — When placing an order, the client pays <strong>20%</strong> of the total website price. This confirms the order and covers the initial design and development work.
      </div>
      <ul>
        <li>After the 20% deposit is paid, our team begins work immediately.</li>
        <li>Once the website is ready, we present it to the client for review.</li>
        <li>If you <strong>LIKE the site</strong><span class="rules-badge-green">✓ Approved</span>: you pay the remaining <strong>80%</strong> and the site goes live.</li>
        <li>If you <strong>DON'T LIKE the site</strong><span class="rules-badge-orange">✗ Declined</span>: the 20% deposit is non-refundable — it covers the work done (design, code, time).</li>
      </ul>`,
    delivery: 'Delivery Time',
    deliveryText: `<ul>
        <li><strong>Basic</strong>: 1–2 working days</li>
        <li><strong>Standard</strong>: 3–5 working days</li>
        <li><strong>Premium</strong>: 7–14 working days</li>
        <li>Timelines may vary depending on project complexity and how quickly the client provides content.</li>
      </ul>`,
    revisions: 'Revisions & Changes',
    revisionsText: `<ul>
        <li>Each package includes free revisions within the first 30 days.</li>
        <li>Further changes are available via the maintenance plan: 1 change (€8), 5 changes (€25), 12 changes (€50).</li>
        <li>A "change" means one content update (text, image, color). Major structural changes may count as multiple changes.</li>
      </ul>`,
    content: 'Content & Materials',
    contentText: `<ul>
        <li>The client is responsible for providing texts, images, and logo in a timely manner.</li>
        <li>If no materials are provided, we will use placeholder content that can be replaced later.</li>
        <li>All materials provided must be owned or properly licensed by the client.</li>
      </ul>`,
    domain: 'Domain & Hosting',
    domainText: `<ul>
        <li>Hosting (€4/month) is optional and can be purchased separately.</li>
        <li>The domain can be bought by the client directly from <strong>GoDaddy</strong> or <strong>Namecheap</strong>, or the price will be confirmed at the time of order.</li>
        <li>The site is published only after full payment (100%) is received.</li>
      </ul>`,
    general: 'General Rules',
    generalText: `<ul>
        <li>By placing an order, the client agrees to all terms and conditions presented here.</li>
        <li>WebBuilder reserves the right to decline projects with illegal, offensive, or rights-infringing content.</li>
        <li>Communication takes place via email, WhatsApp, or the platform chat system.</li>
        <li>Any disputes will be resolved amicably.</li>
      </ul>`,
    ok: 'Got it',
  },
  ru: {
    payment: 'Оплата и процесс',
    paymentText: `
      <div class="rules-highlight">
        🔒 <strong>Предоплата 20%</strong> — При размещении заказа клиент оплачивает <strong>20%</strong> от общей стоимости сайта. Это подтверждает заказ и покрывает начальные работы по дизайну и разработке.
      </div>
      <ul>
        <li>После оплаты 20% наша команда немедленно приступает к работе.</li>
        <li>Когда сайт готов, мы показываем его клиенту для утверждения.</li>
        <li>Если сайт <strong>ПОНРАВИЛСЯ</strong><span class="rules-badge-green">✓ Принято</span>: вы оплачиваете оставшиеся <strong>80%</strong>, и сайт публикуется.</li>
        <li>Если сайт <strong>НЕ ПОНРАВИЛСЯ</strong><span class="rules-badge-orange">✗ Отклонено</span>: предоплата 20% не возвращается — она покрывает выполненную работу (дизайн, код, время).</li>
      </ul>`,
    delivery: 'Сроки доставки',
    deliveryText: `<ul>
        <li><strong>Basic</strong>: 1–2 рабочих дня</li>
        <li><strong>Standard</strong>: 3–5 рабочих дней</li>
        <li><strong>Premium</strong>: 7–14 рабочих дней</li>
        <li>Сроки могут варьироваться в зависимости от сложности проекта и скорости предоставления материалов клиентом.</li>
      </ul>`,
    revisions: 'Правки и изменения',
    revisionsText: `<ul>
        <li>Каждый пакет включает бесплатные правки в течение первых 30 дней.</li>
        <li>Дальнейшие изменения доступны через план обслуживания: 1 изменение (€8), 5 изменений (€25), 12 изменений (€50).</li>
        <li>«Изменение» — это одно обновление контента (текст, изображение, цвет). Крупные структурные изменения могут считаться несколькими.</li>
      </ul>`,
    content: 'Контент и материалы',
    contentText: `<ul>
        <li>Клиент несёт ответственность за своевременное предоставление текстов, изображений и логотипа.</li>
        <li>Если материалы не предоставлены, мы используем демонстрационный контент, который можно заменить позже.</li>
        <li>Все предоставленные материалы должны принадлежать клиенту или быть правильно лицензированы.</li>
      </ul>`,
    domain: 'Домен и хостинг',
    domainText: `<ul>
        <li>Хостинг (€4/месяц) не обязателен и может быть приобретён отдельно.</li>
        <li>Домен клиент может купить самостоятельно на <strong>GoDaddy</strong> или <strong>Namecheap</strong>, или цена будет уточнена при оформлении заказа.</li>
        <li>Сайт публикуется только после полной оплаты (100%).</li>
      </ul>`,
    general: 'Общие правила',
    generalText: `<ul>
        <li>Размещая заказ, клиент соглашается со всеми представленными условиями.</li>
        <li>WebBuilder оставляет за собой право отказать в проектах с незаконным, оскорбительным или нарушающим права содержимым.</li>
        <li>Общение ведётся по email, WhatsApp или через систему чата платформы.</li>
        <li>Все споры решаются в досудебном порядке.</li>
      </ul>`,
    ok: 'Понятно',
  }
};

function getRulesLang() {
  const lang = localStorage.getItem('preferred-language') || 'en';
  return RULES[lang] || RULES.en;
}

function buildRulesModal() {
  if (document.getElementById('rules-modal-bg')) return;
  const bg = document.createElement('div');
  bg.id = 'rules-modal-bg';
  bg.innerHTML = `
  <div class="rules-modal">
    <div class="rules-modal-head">
      <button class="rules-modal-close" onclick="authCloseRules()"><i class="fas fa-times"></i></button>
      <h3 id="rules-title"></h3>
      <p id="rules-subtitle"></p>
    </div>
    <div class="rules-modal-body" id="rules-body"></div>
    <div class="rules-modal-footer">
      <button class="rules-ok-btn" onclick="authCloseRules()" id="rules-ok-btn">Got it</button>
    </div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click', e => { if (e.target === bg) authCloseRules(); });
}

function renderRulesContent() {
  const r = getRulesLang();
  document.getElementById('rules-title').textContent = r.payment ? t('rulesTitle') : 'Terms & Rules';
  document.getElementById('rules-subtitle').textContent = t('rulesSubtitle') || 'Please read carefully';
  document.getElementById('rules-ok-btn').textContent = r.ok;
  document.getElementById('rules-body').innerHTML = `
    <div class="rules-section">
      <h4><i class="fas fa-credit-card"></i> ${r.payment}</h4>
      ${r.paymentText}
    </div>
    <div class="rules-section">
      <h4><i class="fas fa-clock"></i> ${r.delivery}</h4>
      ${r.deliveryText}
    </div>
    <div class="rules-section">
      <h4><i class="fas fa-edit"></i> ${r.revisions}</h4>
      ${r.revisionsText}
    </div>
    <div class="rules-section">
      <h4><i class="fas fa-images"></i> ${r.content}</h4>
      ${r.contentText}
    </div>
    <div class="rules-section">
      <h4><i class="fas fa-globe"></i> ${r.domain}</h4>
      ${r.domainText}
    </div>
    <div class="rules-section">
      <h4><i class="fas fa-balance-scale"></i> ${r.general}</h4>
      ${r.generalText}
    </div>`;
}

function authOpenRules(e) {
  e?.stopPropagation();
  // close user dropdown if open
  document.getElementById('auth-dropdown')?.classList.remove('open');
  renderRulesContent();
  document.getElementById('rules-modal-bg').classList.add('open');
}
function authCloseRules() {
  document.getElementById('rules-modal-bg')?.classList.remove('open');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUILD NAV WRAP (desktop only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildNavWrap() {
  const nav = document.querySelector('.nav-container');
  if (!nav || document.getElementById('auth-nav-wrap')) return;
  const wrap = document.createElement('div');
  wrap.id = 'auth-nav-wrap';
  nav.appendChild(wrap);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUILD MOBILE AUTH SECTION (inside hamburger)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildMobileSection() {
  if (document.getElementById('mob-auth-section')) return;
  // Insert auth section RIGHT AFTER the mobile menu header (at the top)
  const header = document.querySelector('.mobile-menu-header');
  const navLinks = document.querySelector('.mobile-nav-links');
  if (!header || !navLinks) return;
  const sec = document.createElement('div');
  sec.id = 'mob-auth-section';
  sec.className = 'mob-auth-section';
  // Insert between header and nav links so it appears at top
  header.parentNode.insertBefore(sec, navLinks);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RENDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderAll() { renderNav(); renderMobile(); }

function renderNav() {
  const wrap = document.getElementById('auth-nav-wrap');
  if (!wrap) return;
  if (!currentUser) {
    wrap.innerHTML = `<button class="auth-btn-guest" onclick="authOpenModal()">
      <i class="fas fa-user"></i><span>${t('btnGuest')}</span></button>`;
  } else {
    const name    = userProfile.displayName || currentUser.displayName || currentUser.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    wrap.innerHTML = `
    <div class="auth-pill" id="auth-user-pill" onclick="authToggleDropdown()">
      <div class="auth-pill-av">${initial}</div>
      <span class="auth-pill-name">${t('hello')}, ${name}</span>
      <i class="fas fa-chevron-down auth-pill-chev"></i>
      <div class="auth-dropdown" id="auth-dropdown">
        <a class="auth-dd-item" href="orders.html">
          <i class="fas fa-boxes"></i> ${t('myOrders')}
        </a>
        <button class="auth-dd-item" onclick="authOpenRules(event)">
          <i class="fas fa-file-alt"></i> ${t('rules')}
        </button>
        <div class="auth-dd-sep"></div>
        <button class="auth-dd-item danger" onclick="authLogout(event)">
          <i class="fas fa-sign-out-alt"></i> ${t('logout')}
        </button>
      </div>
    </div>`;
  }
}

function renderMobile() {
  const sec = document.getElementById('mob-auth-section');
  if (!sec) return;
  if (!currentUser) {
    sec.innerHTML = `
    <span class="mob-auth-label">${t('mobSection')}</span>
    <button class="mob-auth-cta" onclick="authOpenModal()">
      <div class="mob-auth-cta-icon"><i class="fas fa-user"></i></div>
      <span>${t('mobLogin')}</span>
    </button>`;
  } else {
    const name    = userProfile.displayName || currentUser.displayName || currentUser.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    sec.innerHTML = `
    <span class="mob-auth-label">${t('mobAs')}</span>
    <div class="mob-auth-user">
      <div class="mob-auth-chip">
        <div class="mob-auth-av">${initial}</div>
        <div class="mob-auth-info">
          <span>${t('hello')}</span>
          <span>${name}</span>
        </div>
      </div>
      <a class="mob-auth-link" href="orders.html">
        <i class="fas fa-boxes"></i> ${t('mobOrders')}
      </a>
      <button class="mob-auth-link" onclick="authOpenRules()">
        <i class="fas fa-file-alt"></i> ${t('rules')}
      </button>
      <button class="mob-auth-link red" onclick="authLogout()">
        <i class="fas fa-sign-out-alt"></i> ${t('mobOut')}
      </button>
    </div>`;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function authOpenModal() {
  modalOpen = true; isRegMode = false;
  syncModalUI();
  document.getElementById('auth-modal-bg').classList.add('open');
  setTimeout(() => document.getElementById('auth-email-input')?.focus(), 230);
}
function authCloseModal() {
  modalOpen = false;
  document.getElementById('auth-modal-bg').classList.remove('open');
  document.getElementById('auth-error').style.display = 'none';
  ['auth-email-input','auth-pass-input','auth-name-input','auth-phone-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
}
function authToggleMode() { isRegMode = !isRegMode; syncModalUI(); document.getElementById('auth-error').style.display = 'none'; }

function syncModalUI() {
  document.getElementById('auth-m-title').textContent    = t(isRegMode ? 'regTitle'   : 'loginTitle');
  document.getElementById('auth-m-sub').textContent      = t(isRegMode ? 'regSub'     : 'loginSub');
  document.getElementById('auth-submit-btn').textContent = t(isRegMode ? 'regBtn'     : 'loginBtn');
  document.getElementById('auth-switch-text').textContent= t(isRegMode ? 'hasAcc'     : 'noAcc');
  document.getElementById('auth-switch-link').textContent= t(isRegMode ? 'toLogin'    : 'toReg');
  document.getElementById('auth-lbl-name').textContent   = t('lName');
  document.getElementById('auth-lbl-email').textContent  = t('lEmail');
  document.getElementById('auth-lbl-pass').textContent   = t('lPass');
  document.getElementById('auth-lbl-phone').textContent  = t('lPhone');
  document.getElementById('auth-name-field').style.display  = isRegMode ? 'block' : 'none';
  document.getElementById('auth-phone-field').style.display = isRegMode ? 'block' : 'none';
  document.getElementById('auth-submit-btn').disabled = false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DROPDOWN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function authToggleDropdown() {
  document.getElementById('auth-dropdown')?.classList.toggle('open');
}
document.addEventListener('click', e => {
  const pill = document.getElementById('auth-user-pill');
  if (pill && !pill.contains(e.target)) document.getElementById('auth-dropdown')?.classList.remove('open');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function authSubmit() {
  if (!_auth) return;
  const email = document.getElementById('auth-email-input').value.trim();
  const pass  = document.getElementById('auth-pass-input').value;
  const name  = document.getElementById('auth-name-input').value.trim();
  const phone = document.getElementById('auth-phone-input').value.trim();
  const btn   = document.getElementById('auth-submit-btn');
  const errEl = document.getElementById('auth-error');
  if (!email || !pass) { showAuthErr(t('errGen')); return; }
  if (isRegMode && pass.length < 6) { showAuthErr(t('errWeak')); return; }
  btn.disabled = true; btn.textContent = t(isRegMode ? 'creating' : 'signing');
  errEl.style.display = 'none';
  try {
    if (isRegMode) {
      const cred = await _auth.createUserWithEmailAndPassword(email, pass);
      if (name) await cred.user.updateProfile({ displayName: name });
      if (_db) await _db.collection('users').doc(cred.user.uid).set({
        displayName: name, phone, email, createdAt: new Date().toISOString()
      }, { merge: true });
    } else {
      await _auth.signInWithEmailAndPassword(email, pass);
    }
    authCloseModal();
  } catch(e) {
    const map = {
      'auth/user-not-found':      t('errNoUser'),
      'auth/wrong-password':      t('errPass'),
      'auth/email-already-in-use':t('errInUse'),
      'auth/weak-password':       t('errWeak'),
      'auth/invalid-email':       t('errEmail'),
      'auth/invalid-credential':  t('errPass'),
    };
    showAuthErr(map[e.code] || t('errGen'));
    btn.disabled = false; btn.textContent = t(isRegMode ? 'regBtn' : 'loginBtn');
  }
}
async function authLogout(e) {
  e?.stopPropagation();
  if (_auth) await _auth.signOut();
  localStorage.removeItem('wbp_user');
}
function showAuthErr(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTOFILL ORDER FORM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function tryAutofillForm() {
  if (!currentUser) return;
  setTimeout(() => {
    const nf = document.getElementById('customer-name');
    const ef = document.getElementById('customer-email');
    const pf = document.getElementById('customer-phone');
    if (!nf && !ef) return;
    let filled = false;
    const name = userProfile.displayName || currentUser.displayName || '';
    if (nf && !nf.value && name)               { nf.value = name;                 filled = true; }
    if (ef && !ef.value)                       { ef.value = currentUser.email;     filled = true; }
    if (pf && !pf.value && userProfile.phone)  { pf.value = userProfile.phone;    filled = true; }
    if (filled) {
      const notice = document.getElementById('auth-form-notice');
      if (notice) {
        document.getElementById('auth-form-notice-text').textContent = t('filled');
        notice.classList.add('show');
        setTimeout(() => notice.classList.remove('show'), 3500);
      }
    }
  }, 180);
}
function watchOrderForm() {
  const form = document.getElementById('order-form');
  if (!form) return;
  new MutationObserver(() => {
    if (currentUser && form.classList.contains('active')) tryAutofillForm();
  }).observe(form, { attributes: true, attributeFilter: ['class'] });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RE-RENDER ON LANGUAGE CHANGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function watchLangChange() {
  document.querySelectorAll('.language-option, .language-option-fixed').forEach(el => {
    el.addEventListener('click', () => {
      setTimeout(() => { renderAll(); if (modalOpen) syncModalUI(); }, 60);
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.authOpenModal      = authOpenModal;
window.authCloseModal     = authCloseModal;
window.authToggleMode     = authToggleMode;
window.authSubmit         = authSubmit;
window.authLogout         = authLogout;
window.authToggleDropdown = authToggleDropdown;
window.authOpenRules      = authOpenRules;
window.authCloseRules     = authCloseRules;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BOOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.addEventListener('DOMContentLoaded', () => {
  injectStyles();
  buildModal();
  buildNavWrap();
  buildMobileSection();
  buildRulesModal();
  initAuth();
  watchOrderForm();
  watchLangChange();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOpen) authCloseModal();
  });
});

})();