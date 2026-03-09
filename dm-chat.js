/**
 * WebBuilder — Direct Message Chat (dm-chat.js)
 * Extracted from index.html inline script.
 * Fixed: uses user.uid as chatId (matches Firestore rule: request.auth.uid == chatId)
 * Fixed: "service not available" — retries if Firebase not ready yet
 */
(function () {
'use strict';

let _db = null, _auth = null;
let _dmUser = null, _dmChatId = null, _dmUnsub = null, _dmReg = false;
let _panelOpen = false, _dmNotifCount = 0;

// ── Firebase init ──────────────────────────────────────────────────────
function dmFirebase() {
  try {
    if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') return;
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    _db   = firebase.firestore();
    _auth = firebase.auth();
    _auth.onAuthStateChanged(u => {
      _dmUser = u;
      if (u) { dmOnLogin(u); }
      else   { dmOnLogout(); }
    });
  } catch(e) { console.warn('DM firebase:', e); }
}

// ── Login / Logout ─────────────────────────────────────────────────────
function dmOnLogin(u) {
  _dmChatId = u.uid; // ✅ UID as chatId — matches Firestore rule
  const authScreen = document.getElementById('wbp-msg-screen-auth');
  const chatScreen = document.getElementById('wbp-msg-screen-chat');
  if (authScreen) authScreen.style.display = 'none';
  if (chatScreen) chatScreen.style.display = 'flex';
  if (_dmUnsub) _dmUnsub();
  if (_db) {
    _dmUnsub = _db.collection('chats').doc(_dmChatId)
      .onSnapshot(snap => {
        const data   = snap.exists ? snap.data() : {};
        dmRenderMessages(data.messages || []);
        const msgs   = data.messages || [];
        const unread = msgs.filter(m => m.from === 'admin' && !m.readByUser).length;
        if (unread > 0 && !_panelOpen) dmSetBadge(unread);
        if (_panelOpen && unread > 0) {
          const updated = msgs.map(m => m.from === 'admin' ? { ...m, readByUser: true } : m);
          _db.collection('chats').doc(_dmChatId).set(
            { messages: updated, email: u.email, lastUpdated: new Date().toISOString() },
            { merge: true }
          );
        }
      });
  }
  setTimeout(() => document.getElementById('wbp-msg-txt')?.focus(), 200);
}

function dmOnLogout() {
  if (_dmUnsub) { _dmUnsub(); _dmUnsub = null; }
  _dmChatId = null;
  const authScreen = document.getElementById('wbp-msg-screen-auth');
  const chatScreen = document.getElementById('wbp-msg-screen-chat');
  if (authScreen) authScreen.style.display = '';
  if (chatScreen) chatScreen.style.display = 'none';
}

// ── Render messages ────────────────────────────────────────────────────
function dmRenderMessages(msgs) {
  const container = document.getElementById('wbp-msg-messages');
  const noMsg     = document.getElementById('wbp-msg-no');
  if (!container) return;
  Array.from(container.querySelectorAll('.wbp-direct-msg')).forEach(el => el.remove());
  if (!msgs || msgs.length === 0) { if (noMsg) noMsg.style.display = 'flex'; return; }
  if (noMsg) noMsg.style.display = 'none';
  msgs.forEach(m => {
    const mine    = m.from === 'client' || m.from === 'user';
    const time    = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const initial = mine ? (_dmUser?.email?.charAt(0) || 'U').toUpperCase() : 'W';
    const div     = document.createElement('div');
    div.className = 'wbp-direct-msg ' + (mine ? 'mine' : 'theirs');
    div.innerHTML = `<div class="wbp-direct-av">${dmEsc(initial)}</div><div><div class="wbp-direct-bub"><div class="wbp-direct-bub-inner"><span class="wbp-direct-text">${dmEsc(m.text)}</span><span class="wbp-direct-time">${time}</span></div></div></div>`;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

// ── Send message ───────────────────────────────────────────────────────
async function wbpMsgSend() {
  if (!_dmUser || !_dmChatId || !_db) return;
  const input = document.getElementById('wbp-msg-txt');
  const text  = input.value.trim();
  if (!text) return;
  const btn = document.getElementById('wbp-msg-send-btn');
  btn.disabled = true; input.value = '';
  const msg = { from: 'client', text, timestamp: new Date().toISOString(), author: _dmUser.email.split('@')[0] };
  try {
    const ref      = _db.collection('chats').doc(_dmChatId);
    const snap     = await ref.get();
    const existing = snap.exists ? (snap.data().messages || []) : [];
    await ref.set({
      messages:       [...existing, msg],
      email:          _dmUser.email,
      uid:            _dmUser.uid,
      lastMessage:    text,
      lastUpdated:    new Date().toISOString(),
      hasUnreadAdmin: true
    }, { merge: true });
  } catch(e) { console.error('Send DM:', e); }
  finally { btn.disabled = false; input.focus(); }
}

// ── Auth actions ───────────────────────────────────────────────────────
async function wbpMsgAuth() {
  const email = document.getElementById('wbp-msg-email').value.trim();
  const pass  = document.getElementById('wbp-msg-pass').value;
  const btn   = document.getElementById('wbp-msg-auth-btn');
  const err   = document.getElementById('wbp-msg-auth-err');
  if (!email || !pass) { dmShowErr('Please fill in all fields.'); return; }
  // If Firebase isn't ready yet, try to init and retry once
  if (!_auth) {
    dmFirebase();
    btn.disabled    = true;
    btn.textContent = 'Connecting...';
    setTimeout(wbpMsgAuth, 1000);
    return;
  }
  btn.disabled    = true;
  btn.textContent = _dmReg ? 'Creating...' : 'Signing in...';
  if (err) err.style.display = 'none';
  const resetOk = document.getElementById('wbp-msg-reset-ok');
  if (resetOk) resetOk.style.display = 'none';
  try {
    if (_dmReg) {
      await _auth.createUserWithEmailAndPassword(email, pass);
    } else {
      await _auth.signInWithEmailAndPassword(email, pass);
    }
  } catch(e) {
    const msgs = {
      'auth/user-not-found':       'No account with this email.',
      'auth/wrong-password':       'Incorrect password.',
      'auth/invalid-credential':   'Wrong email or password.',
      'auth/email-already-in-use': 'Email already registered.',
      'auth/weak-password':        'Password must be 6+ characters.',
      'auth/invalid-email':        'Invalid email.',
      'auth/too-many-requests':    'Too many attempts. Try again later.',
    };
    dmShowErr(msgs[e.code] || 'Error. Please try again.');
    btn.disabled    = false;
    btn.textContent = _dmReg ? 'Create Account' : 'Sign In';
  }
}

async function wbpMsgResetPwd() {
  const email = document.getElementById('wbp-msg-email').value.trim();
  const ok    = document.getElementById('wbp-msg-reset-ok');
  if (!email) { dmShowErr('Enter your email first.'); return; }
  if (!_auth) { dmShowErr('Service not ready. Refresh the page.'); return; }
  const err = document.getElementById('wbp-msg-auth-err');
  if (err) err.style.display = 'none';
  try {
    await _auth.sendPasswordResetEmail(email);
    if (ok) ok.style.display = 'block';
  } catch(e) {
    dmShowErr('Could not send reset email. Check the address.');
  }
}

function wbpMsgToggleReg() {
  _dmReg = !_dmReg;
  wbpMsgUpdateLangUI();
  const err = document.getElementById('wbp-msg-auth-err');
  const ok  = document.getElementById('wbp-msg-reset-ok');
  if (err) err.style.display = 'none';
  if (ok)  ok.style.display  = 'none';
  // Re-enable button in case it was left disabled
  const btn = document.getElementById('wbp-msg-auth-btn');
  if (btn) btn.disabled = false;
}

// ── Badge ──────────────────────────────────────────────────────────────
function dmSetBadge(n) {
  _dmNotifCount = n;
  const badge = document.getElementById('dm-notif-badge');
  if (badge) {
    badge.textContent   = n > 0 ? String(n) : '';
    badge.style.display = n > 0 ? 'flex'    : 'none';
  }
}

// ── Panel open / close ─────────────────────────────────────────────────
function wbpMsgDirectOpen() {
  const panel = document.getElementById('wbp-msg-panel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    wbpMsgClose();
  } else {
    _panelOpen = true;
    panel.classList.add('open');
    dmSetBadge(0);
    if (_dmUser) {
      dmOnLogin(_dmUser);
      setTimeout(() => document.getElementById('wbp-msg-txt')?.focus(), 300);
    } else {
      setTimeout(() => document.getElementById('wbp-msg-email')?.focus(), 300);
    }
  }
}

function wbpMsgClose() {
  _panelOpen = false;
  document.getElementById('wbp-msg-panel')?.classList.remove('open');
}

function wbpMsgTogglePanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('wbp-msg-panel');
  _panelOpen  = !panel.classList.contains('open');
  panel.classList.toggle('open', _panelOpen);
  window._panelOpen = _panelOpen;
  if (_panelOpen) {
    dmSetBadge(0);
    if (_dmUser) {
      dmOnLogin(_dmUser);
      setTimeout(() => document.getElementById('wbp-msg-txt')?.focus(), 300);
    } else {
      setTimeout(() => document.getElementById('wbp-msg-email')?.focus(), 300);
    }
  }
}

// ── Language UI ────────────────────────────────────────────────────────
function dmGetTrans(key) {
  try {
    const lang = localStorage.getItem('preferred-language') || 'en';
    const ls   = window._langSys;
    if (ls && ls.translations && ls.translations[lang] && ls.translations[lang][key])
      return ls.translations[lang][key];
  } catch(e) {}
  const fallback = {
    'chat.hello':        'Say hello 👋',
    'chat.signin_sub':   'Sign in to chat with us',
    'chat.signup_title': 'Create account',
    'chat.signup_sub':   'Create a free account to chat with us',
    'chat.signin_btn':   'Sign In',
    'chat.signup_btn':   'Create Account',
    'chat.no_account':   "Don't have an account?",
    'chat.create_one':   'Create one',
    'chat.has_account':  'Already have an account?',
    'chat.forgot':       'Forgot password?',
    'chat.reset_ok':     '✅ Reset email sent! Check your inbox.',
  };
  return fallback[key] || key;
}

function wbpMsgUpdateLangUI() {
  const t = dmGetTrans;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('wbp-msg-auth-title',  _dmReg ? t('chat.signup_title') : t('chat.hello'));
  set('wbp-msg-auth-sub',    _dmReg ? t('chat.signup_sub')   : t('chat.signin_sub'));
  set('wbp-msg-auth-btn',    _dmReg ? t('chat.signup_btn')   : t('chat.signin_btn'));
  set('wbp-msg-switch-txt',  _dmReg ? t('chat.has_account')  : t('chat.no_account'));
  set('wbp-msg-switch-link', _dmReg ? t('chat.signin_btn')   : t('chat.create_one'));
}

// ── Helpers ────────────────────────────────────────────────────────────
function dmShowErr(msg) {
  const el = document.getElementById('wbp-msg-auth-err');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function dmEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Expose globals ─────────────────────────────────────────────────────
window.wbpMsgTogglePanel = wbpMsgTogglePanel;
window.wbpMsgClose       = wbpMsgClose;
window.wbpMsgAuth        = wbpMsgAuth;
window.wbpMsgResetPwd    = wbpMsgResetPwd;
window.wbpMsgToggleReg   = wbpMsgToggleReg;
window.wbpMsgSend        = wbpMsgSend;
window.wbpMsgDirectOpen  = wbpMsgDirectOpen;
window._dmOnLogin        = dmOnLogin;
Object.defineProperty(window, '_dmUser', { get: () => _dmUser });

// ── Boot ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('wbp-msg-txt')?.addEventListener('keydown',   e => { if (e.key === 'Enter') wbpMsgSend(); });
  document.getElementById('wbp-msg-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('wbp-msg-pass')?.focus(); });
  document.getElementById('wbp-msg-pass')?.addEventListener('keydown',  e => { if (e.key === 'Enter') wbpMsgAuth(); });
  dmFirebase();
});

})();
