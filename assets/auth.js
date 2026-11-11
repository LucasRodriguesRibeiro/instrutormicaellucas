(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURAÇÃO DO SUPABASE (PLANO GRATUITO — ULTRA-LOW EGRESS)
  // ==========================================================================
  var SUPABASE_URL = 'https://qnyiahwmbdphdnjocqpl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_jMLj1Slf-5LSAbJQ24GOig_3j_SWOk9';

  // Tempo de cache local da sessão (24 horas sem gastar Egress do Supabase)
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  var STORAGE_KEY = 'iml_auth_session_v2';

  function getSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.email || data.ok !== true) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function saveSession(email, nome) {
    var payload = JSON.stringify({
      ok: true,
      email: String(email || '').trim().toLowerCase(),
      nome: String(nome || 'Aluno').trim(),
      ts: Date.now()
    });
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      sessionStorage.setItem(STORAGE_KEY, payload);
    } catch (e) {}
  }

  function clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('iml_auth_token_v1');
      sessionStorage.removeItem('iml_auth_token_v1');
    } catch (e) {}
    location.reload();
  }

  window.imlLogout = clearSession;

  function isSupabaseConfigured() {
    return (
      SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      SUPABASE_URL.indexOf('http') === 0 &&
      SUPABASE_URL.indexOf('COLE_SUA_') === -1 &&
      SUPABASE_ANON_KEY.indexOf('COLE_SUA_') === -1
    );
  }

  // Consulta RPC ultraleve (< 45 bytes de resposta)
  function checkEmailOnSupabase(email) {
    var cleanEmail = String(email || '').trim().toLowerCase();
    var baseUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    var endpoint = baseUrl + '/rest/v1/rpc/verificar_acesso_email';

    var headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    };
    if (SUPABASE_ANON_KEY.indexOf('eyJ') === 0) {
      headers['Authorization'] = 'Bearer ' + SUPABASE_ANON_KEY;
    }

    return fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ p_email: cleanEmail })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP_' + res.status);
      return res.json();
    });
  }

  // Inject guard CSS immediately so protected content never flashes before login
  var guardStyle = document.createElement('style');
  guardStyle.id = 'iml-auth-guard-style';
  guardStyle.textContent =
    'html.iml-locked, html.iml-locked body { overflow: hidden !important; height: 100% !important; }' +
    'html.iml-locked body > *:not(#iml-auth-gate) { display: none !important; }' +
    '#iml-auth-gate { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px; background: radial-gradient(circle at 80% 20%, rgba(37,99,235,0.28), transparent 45%), linear-gradient(135deg, #07172f 0%, #0d254c 100%); font-family: Inter, sans-serif; color: #13213a; }' +
    '.iml-auth-card { width: 100%; max-width: 420px; background: #ffffff; border: 1px solid #e1e8f2; border-top: 5px solid #f7bd2f; border-radius: 22px; padding: 34px 28px 30px; box-shadow: 0 24px 60px rgba(0,0,0,0.45); text-align: center; }' +
    '.iml-auth-logo { width: 68px; height: 68px; border-radius: 18px; object-fit: cover; border: 2px solid #f7bd2f; box-shadow: 0 6px 18px rgba(7,23,47,0.18); margin-bottom: 12px; }' +
    '.iml-auth-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: #fff8e1; border: 1px solid #f7bd2f88; color: #926000; font: 800 10px Montserrat, sans-serif; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 10px; }' +
    '.iml-auth-card h1 { font: 800 22px/1.2 Montserrat, sans-serif; color: #07172f; margin: 0 0 8px; }' +
    '.iml-auth-card p { font-size: 13.5px; color: #64748b; margin: 0 0 22px; line-height: 1.55; }' +
    '.iml-auth-field { text-align: left; margin-bottom: 14px; }' +
    '.iml-auth-field label { display: block; font: 700 12px Montserrat, sans-serif; color: #1e293b; margin-bottom: 6px; }' +
    '.iml-auth-input-wrap { position: relative; display: flex; align-items: center; }' +
    '.iml-auth-input-wrap > i { position: absolute; left: 14px; color: #64748b; font-size: 14px; pointer-events: none; }' +
    '.iml-auth-input { width: 100%; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 13px 14px 13px 40px; font: 500 14px Inter, sans-serif; color: #0f172a; background: #f8fafc; outline: none; transition: 0.18s; }' +
    '.iml-auth-input:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.14); }' +
    '.iml-auth-error { display: none; align-items: flex-start; gap: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 10px; padding: 10px 12px; font-size: 12px; font-weight: 600; text-align: left; margin-bottom: 14px; line-height: 1.45; }' +
    '.iml-auth-error.show { display: flex; }' +
    '.iml-auth-error i { margin-top: 2px; flex-shrink: 0; }' +
    '.iml-auth-btn { width: 100%; border: 0; border-radius: 12px; padding: 13px 18px; background: #059669; color: #fff; font: 800 14px Montserrat, sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; box-shadow: 0 6px 18px rgba(5,150,105,0.28); transition: 0.2s; margin-top: 4px; }' +
    '.iml-auth-btn:hover:not(:disabled) { background: #047857; }' +
    '.iml-auth-btn:disabled { opacity: 0.7; cursor: wait; }' +
    '.iml-auth-hint { margin-top: 14px; padding: 10px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11.5px; color: #475569; text-align: left; display: flex; align-items: center; gap: 8px; line-height: 1.4; }' +
    '.iml-auth-hint i { color: #f59e0b; font-size: 14px; flex-shrink: 0; }' +
    '.iml-auth-foot { margin-top: 16px; padding-top: 14px; border-top: 1px solid #edf1f6; font-size: 11px; color: #94a3b8; }' +
    '.iml-logout-btn { border: 1px solid rgba(247,189,47,0.45); background: rgba(255,255,255,0.06); color: #dce4ef; border-radius: 999px; padding: 7px 12px; font: 700 11px Inter, sans-serif; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.18s; }' +
    '.iml-logout-btn:hover { background: rgba(225,29,72,0.22); border-color: #f87171; color: #fff; }' +
    '.iml-student-pill { color: #bfcbdd; font: 600 11px Inter, sans-serif; display: inline-flex; align-items: center; gap: 5px; }' +
    '@media(max-width:650px){ .iml-student-pill { display: none; } }';
  document.head.appendChild(guardStyle);

  var currentSession = getSession();
  if (!currentSession) {
    document.documentElement.classList.add('iml-locked');
  }

  function injectLogoutButton(session) {
    var nav = document.querySelector('.topbar .nav');
    if (!nav || document.getElementById('iml-logout-top')) return;
    var rightWrap = document.createElement('div');
    rightWrap.style.cssText = 'display:flex;align-items:center;gap:10px';
    var cred = nav.querySelector('.credential');
    if (cred) {
      rightWrap.appendChild(cred);
    }
    if (session && session.nome) {
      var userPill = document.createElement('span');
      userPill.className = 'iml-student-pill';
      userPill.innerHTML = '<i class="fa-regular fa-circle-user" style="color:#f7bd2f"></i> ' +
        String(session.nome).replace(/[<>&"']/g, '');
      rightWrap.appendChild(userPill);
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

  // Revalidação silenciosa apenas quando o cache de 24h expira (economiza 99% de Egress)
  function revalidateIfExpired(session) {
    if (!session || !isSupabaseConfigured()) return;
    var age = Date.now() - Number(session.ts || 0);
    if (age < CACHE_TTL_MS) return; // Dentro das 24h: zero requisições ao Supabase!

    checkEmailOnSupabase(session.email)
      .then(function (res) {
        if (res && res.ok === true) {
          saveSession(session.email, res.n || session.nome);
        } else {
          // Reembolsado ou bloqueado na Hotmart -> encerra sessão imediatamente
          clearSession();
        }
      })
      .catch(function () {
        // Se estiver sem internet no momento, mantém o cache local para não prejudicar o aluno
      });
  }

  function mountGate() {
    var session = getSession();
    if (session) {
      document.documentElement.classList.remove('iml-locked');
      injectLogoutButton(session);
      revalidateIfExpired(session);
      return;
    }

    var gate = document.createElement('div');
    gate.id = 'iml-auth-gate';
    gate.innerHTML =
      '<form class="iml-auth-card" id="iml-auth-form" autocomplete="on">' +
        '<img src="logomicaellucas.jpeg" alt="Instrutor Micael Lucas" class="iml-auth-logo">' +
        '<div><span class="iml-auth-badge"><i class="fa-solid fa-lock"></i> Acesso Exclusivo Alunos</span></div>' +
        '<h1>Área do Aluno</h1>' +
        '<p>Digite abaixo o <strong>mesmo e-mail utilizado na sua compra</strong> para liberar seu acesso imediato à plataforma.</p>' +
        '<div class="iml-auth-field">' +
          '<label for="iml-email">E-mail da Compra</label>' +
          '<div class="iml-auth-input-wrap">' +
            '<i class="fa-solid fa-envelope"></i>' +
            '<input class="iml-auth-input" id="iml-email" type="email" placeholder="seuemail@exemplo.com" required autocomplete="email">' +
          '</div>' +
        '</div>' +
        '<div class="iml-auth-error" id="iml-auth-err">' +
          '<i class="fa-solid fa-circle-exclamation"></i>' +
          '<span id="iml-auth-err-msg">E-mail não encontrado.</span>' +
        '</div>' +
        '<button class="iml-auth-btn" id="iml-auth-submit" type="submit">' +
          '<i class="fa-solid fa-right-to-bracket"></i> Acessar Plataforma' +
        '</button>' +
        '<div class="iml-auth-hint">' +
          '<i class="fa-solid fa-bolt"></i>' +
          '<span>Comprou agora na <strong>Hotmart</strong>? Seu acesso é liberado automaticamente assim que o pagamento é aprovado.</span>' +
        '</div>' +
        '<div class="iml-auth-foot"><i class="fa-solid fa-shield-halved"></i> Instrutor Credenciado pelo Detran · Salvador e Região</div>' +
      '</form>';

    document.body.appendChild(gate);

    var emailEl = document.getElementById('iml-email');
    var errEl = document.getElementById('iml-auth-err');
    var errMsgEl = document.getElementById('iml-auth-err-msg');
    var submitBtn = document.getElementById('iml-auth-submit');

    function showError(msg) {
      errMsgEl.textContent = msg;
      errEl.classList.add('show');
    }

    document.getElementById('iml-auth-form').onsubmit = function (e) {
      e.preventDefault();
      errEl.classList.remove('show');

      var email = String(emailEl.value || '').trim().toLowerCase();
      if (!email || email.indexOf('@') === -1) {
        showError('Por favor, digite um e-mail válido.');
        emailEl.focus();
        return;
      }

      if (!isSupabaseConfigured()) {
        showError('A conexão com o banco de dados (SUPABASE_URL e SUPABASE_ANON_KEY) ainda precisa ser preenchida em assets/auth.js.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando acesso...';

      checkEmailOnSupabase(email)
        .then(function (res) {
          if (res && res.ok === true) {
            var nome = res.n || 'Aluno';
            saveSession(email, nome);
            gate.remove();
            document.documentElement.classList.remove('iml-locked');
            injectLogoutButton(getSession());
          } else if (res && (res.s === 'reembolsado' || res.s === 'cancelado')) {
            showError('O acesso vinculado a este e-mail foi cancelado ou reembolsado na Hotmart.');
          } else if (res && res.s === 'expirado') {
            showError('O prazo de acesso deste e-mail expirou. Entre em contato com o suporte.');
          } else {
            showError('E-mail não encontrado. Verifique se digitou o mesmo e-mail usado na compra da Hotmart.');
          }
        })
        .catch(function () {
          showError('Não foi possível validar seu acesso agora. Verifique sua conexão com a internet e tente novamente.');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Acessar Plataforma';
        });
    };

    setTimeout(function () {
      emailEl.focus();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountGate);
  } else {
    mountGate();
  }
})();
