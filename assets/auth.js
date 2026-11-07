(function () {
  'use strict';

  var EXPECTED_DIGEST = 'd73b55e1f9fe334375f62cdee036baa92b907c0520a1be10514fe70bccbbe999';
  var SALT = 'iml_detran_ba_v1_9f8a7b';
  var STORAGE_KEY = 'iml_auth_token_v1';

  // Pure JS SHA-256 implementation (works on HTTPS, HTTP, and local file://)
  function sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - (i % 4)) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;
    for (j = 0; j < words[lengthProperty]; ) {
      var w = words.slice(j, (j += 16));
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var i2 = i + j;
        var w15 = w[i - 15],
          w2 = w[i - 2];
        var a = hash[0],
          e = hash[4];
        var temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        var temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  function toUtf8Binary(str) {
    return unescape(encodeURIComponent(str));
  }

  function computeDigest(user, pass) {
    var h = toUtf8Binary(SALT + '|' + String(user || '').trim().toLowerCase() + '|' + String(pass || '').trim());
    for (var i = 0; i < 1000; i++) {
      h = sha256(h);
    }
    return h;
  }

  function isAuthenticated() {
    try {
      var tok = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      return tok === EXPECTED_DIGEST;
    } catch (e) {
      return false;
    }
  }

  function saveSession() {
    try {
      sessionStorage.setItem(STORAGE_KEY, EXPECTED_DIGEST);
      localStorage.setItem(STORAGE_KEY, EXPECTED_DIGEST);
    } catch (e) {}
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    location.reload();
  }

  window.imlLogout = clearSession;

  // Inject guard CSS immediately so protected content never flashes before login
  var guardStyle = document.createElement('style');
  guardStyle.id = 'iml-auth-guard-style';
  guardStyle.textContent =
    'html.iml-locked, html.iml-locked body { overflow: hidden !important; height: 100% !important; }' +
    'html.iml-locked body > *:not(#iml-auth-gate) { display: none !important; }' +
    '#iml-auth-gate { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px; background: radial-gradient(circle at 80% 20%, rgba(37,99,235,0.28), transparent 45%), linear-gradient(135deg, #07172f 0%, #0d254c 100%); font-family: Inter, sans-serif; color: #13213a; }' +
    '.iml-auth-card { width: 100%; max-width: 410px; background: #ffffff; border: 1px solid #e1e8f2; border-top: 5px solid #f7bd2f; border-radius: 22px; padding: 34px 28px 30px; box-shadow: 0 24px 60px rgba(0,0,0,0.45); text-align: center; }' +
    '.iml-auth-logo { width: 68px; height: 68px; border-radius: 18px; object-fit: cover; border: 2px solid #f7bd2f; box-shadow: 0 6px 18px rgba(7,23,47,0.18); margin-bottom: 12px; }' +
    '.iml-auth-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: #fff8e1; border: 1px solid #f7bd2f88; color: #926000; font: 800 10px Montserrat, sans-serif; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 10px; }' +
    '.iml-auth-card h1 { font: 800 22px/1.2 Montserrat, sans-serif; color: #07172f; margin: 0 0 6px; }' +
    '.iml-auth-card p { font-size: 13px; color: #64748b; margin: 0 0 22px; line-height: 1.5; }' +
    '.iml-auth-field { text-align: left; margin-bottom: 14px; }' +
    '.iml-auth-field label { display: block; font: 700 12px Montserrat, sans-serif; color: #1e293b; margin-bottom: 6px; }' +
    '.iml-auth-input-wrap { position: relative; display: flex; align-items: center; }' +
    '.iml-auth-input-wrap > i { position: absolute; left: 14px; color: #64748b; font-size: 14px; pointer-events: none; }' +
    '.iml-auth-input { width: 100%; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 12px 40px 12px 38px; font: 500 14px Inter, sans-serif; color: #0f172a; background: #f8fafc; outline: none; transition: 0.18s; }' +
    '.iml-auth-input:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.14); }' +
    '.iml-auth-eye { position: absolute; right: 10px; border: 0; background: transparent; color: #64748b; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; }' +
    '.iml-auth-error { display: none; align-items: center; gap: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 10px; padding: 10px 12px; font-size: 12px; font-weight: 600; text-align: left; margin-bottom: 14px; }' +
    '.iml-auth-error.show { display: flex; }' +
    '.iml-auth-btn { width: 100%; border: 0; border-radius: 12px; padding: 13px 18px; background: #059669; color: #fff; font: 800 14px Montserrat, sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; box-shadow: 0 6px 18px rgba(5,150,105,0.28); transition: 0.2s; margin-top: 4px; }' +
    '.iml-auth-btn:hover { background: #047857; }' +
    '.iml-auth-foot { margin-top: 18px; padding-top: 14px; border-top: 1px solid #edf1f6; font-size: 11px; color: #94a3b8; }' +
    '.iml-logout-btn { border: 1px solid rgba(247,189,47,0.45); background: rgba(255,255,255,0.06); color: #dce4ef; border-radius: 999px; padding: 7px 12px; font: 700 11px Inter, sans-serif; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.18s; }' +
    '.iml-logout-btn:hover { background: rgba(225,29,72,0.22); border-color: #f87171; color: #fff; }';
  document.head.appendChild(guardStyle);

  if (!isAuthenticated()) {
    document.documentElement.classList.add('iml-locked');
  }

  function injectLogoutButton() {
    var nav = document.querySelector('.topbar .nav');
    if (!nav || document.getElementById('iml-logout-top')) return;
    var rightWrap = document.createElement('div');
    rightWrap.style.cssText = 'display:flex;align-items:center;gap:10px';
    var cred = nav.querySelector('.credential');
    if (cred) {
      rightWrap.appendChild(cred);
    }
    var btn = document.createElement('button');
    btn.id = 'iml-logout-top';
    btn.type = 'button';
    btn.className = 'iml-logout-btn';
    btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> <span>Sair</span>';
    btn.onclick = clearSession;
    rightWrap.appendChild(btn);
    nav.appendChild(rightWrap);
  }

  function mountGate() {
    if (isAuthenticated()) {
      document.documentElement.classList.remove('iml-locked');
      injectLogoutButton();
      return;
    }

    var gate = document.createElement('div');
    gate.id = 'iml-auth-gate';
    gate.innerHTML =
      '<form class="iml-auth-card" id="iml-auth-form" autocomplete="off">' +
        '<img src="logomicaellucas.jpeg" alt="Instrutor Micael Lucas" class="iml-auth-logo">' +
        '<div><span class="iml-auth-badge"><i class="fa-solid fa-lock"></i> Acesso Restrito</span></div>' +
        '<h1>Área do Aluno</h1>' +
        '<p>Plataforma exclusiva dos alunos do <strong>Instrutor Micael Lucas</strong>. Digite seu login e senha para acessar.</p>' +
        '<div class="iml-auth-field">' +
          '<label for="iml-user">Login</label>' +
          '<div class="iml-auth-input-wrap">' +
            '<i class="fa-solid fa-user"></i>' +
            '<input class="iml-auth-input" id="iml-user" type="text" placeholder="Digite seu login" required autocomplete="username">' +
          '</div>' +
        '</div>' +
        '<div class="iml-auth-field">' +
          '<label for="iml-pass">Senha</label>' +
          '<div class="iml-auth-input-wrap">' +
            '<i class="fa-solid fa-key"></i>' +
            '<input class="iml-auth-input" id="iml-pass" type="password" placeholder="Digite sua senha" required autocomplete="current-password">' +
            '<button class="iml-auth-eye" type="button" id="iml-toggle-pass" aria-label="Mostrar senha"><i class="fa-regular fa-eye"></i></button>' +
          '</div>' +
        '</div>' +
        '<div class="iml-auth-error" id="iml-auth-err"><i class="fa-solid fa-circle-exclamation"></i><span>Login ou senha incorretos. Tente novamente.</span></div>' +
        '<button class="iml-auth-btn" type="submit"><i class="fa-solid fa-right-to-bracket"></i> Entrar na Plataforma</button>' +
        '<div class="iml-auth-foot"><i class="fa-solid fa-shield-halved"></i> Instrutor Credenciado pelo Detran · Salvador e Região</div>' +
      '</form>';

    document.body.appendChild(gate);

    var userEl = document.getElementById('iml-user');
    var passEl = document.getElementById('iml-pass');
    var errEl = document.getElementById('iml-auth-err');
    var toggleBtn = document.getElementById('iml-toggle-pass');

    toggleBtn.onclick = function () {
      var isPass = passEl.type === 'password';
      passEl.type = isPass ? 'text' : 'password';
      toggleBtn.innerHTML = isPass ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    };

    document.getElementById('iml-auth-form').onsubmit = function (e) {
      e.preventDefault();
      var digest = computeDigest(userEl.value, passEl.value);
      if (digest === EXPECTED_DIGEST) {
        saveSession();
        gate.remove();
        document.documentElement.classList.remove('iml-locked');
        injectLogoutButton();
      } else {
        errEl.classList.add('show');
        passEl.value = '';
        passEl.focus();
      }
    };

    setTimeout(function () {
      userEl.focus();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountGate);
  } else {
    mountGate();
  }
})();

