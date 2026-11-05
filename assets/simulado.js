(function(){
  'use strict';

  var prova = window.SIMULADO || window.PROVA_ATUAL;
  if (!prova || !Array.isArray(prova.questoes)) {
    document.getElementById('app').innerHTML = '<div class="sim-result"><div class="sim-res-card"><h1>Simulado indisponível</h1><p>Não foi possível carregar as questões deste simulado.</p><a class="btn primary" href="simulados.html">Voltar aos simulados</a></div></div>';
    return;
  }

  var questoes = prova.questoes;
  var resp = new Array(questoes.length).fill(null);
  var atual = 0;
  var duracaoMin = prova.duracao || 60;
  var seg = duracaoMin * 60;
  var tid = null;

  function fmt(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function feitas() {
    return resp.filter(function(r) { return r !== null; }).length;
  }

  function proximaPendente() {
    for (var i = atual + 1; i < questoes.length; i++) if (resp[i] === null) return i;
    for (var j = 0; j < atual; j++) if (resp[j] === null) return j;
    return -1;
  }

  function renderQuestao() {
    var q = questoes[atual];
    var totalFeitas = feitas();

    var imgHtml = '';
    if (q.img) {
      imgHtml = '<div class="sim-q-img-wrap"><img src="' + q.img + '" alt="Ilustração da questão ' + (atual + 1) + '" class="sim-q-img"></div>';
    }

    document.getElementById('sqa').innerHTML =
      '<div class="sim-q-meta">' +
        '<span class="sim-q-label">Questão ' + (atual + 1) + ' de ' + questoes.length + '</span>' +
        '<span class="sim-q-mat">' + (q.mat || prova.materia || 'Detran') + '</span>' +
      '</div>' +
      '<p class="sim-q-txt">' + q.txt + '</p>' +
      imgHtml +
      '<div class="sim-ops">' +
        q.ops.map(function(op, i) {
          return '<button class="sim-op' + (resp[atual] === i ? ' selected' : '') + '" data-i="' + i + '">' + op + '</button>';
        }).join('') +
      '</div>' +
      '<div class="sim-nav">' +
        '<button class="sim-nav-btn" id="sp" ' + (atual === 0 ? 'disabled' : '') + '><i class="fa-solid fa-arrow-left"></i> Anterior</button>' +
        '<button class="sim-skip" id="skip">Pular <i class="fa-solid fa-arrow-right"></i></button>' +
        '<button class="sim-nav-btn snext" id="sn">' +
          (totalFeitas === questoes.length ? '<i class="fa-solid fa-flag-checkered"></i> Finalizar prova' : 'Próxima <i class="fa-solid fa-arrow-right"></i>') +
        '</button>' +
      '</div>';

    document.getElementById('spg').textContent = totalFeitas + '/' + questoes.length + ' respondidas';
    
    document.getElementById('sgd').innerHTML = questoes.map(function(_, i) {
      var c = 'sim-q-btn';
      if (i === atual) c += ' sqcur';
      if (resp[i] !== null) c += ' sqok';
      return '<button class="' + c + '" data-q="' + i + '">' + (i + 1) + '</button>';
    }).join('');

    // Eventos
    document.querySelectorAll('.sim-op').forEach(function(b) {
      b.onclick = function() {
        resp[atual] = Number(b.dataset.i);
        renderQuestao();
      };
    });

    document.querySelectorAll('.sim-q-btn').forEach(function(b) {
      b.onclick = function() {
        atual = Number(b.dataset.q);
        renderQuestao();
      };
    });

    document.getElementById('sp').onclick = function() {
      if (atual > 0) {
        atual--;
        renderQuestao();
      }
    };

    document.getElementById('skip').onclick = function() {
      var nx = proximaPendente();
      if (nx >= 0) {
        atual = nx;
        renderQuestao();
      } else {
        if (atual < questoes.length - 1) {
          atual++;
          renderQuestao();
        } else {
          alert('Você está na última questão. Todas as questões já foram respondidas ou visualizadas.');
        }
      }
    };

    document.getElementById('sn').onclick = function() {
      if (totalFeitas === questoes.length) {
        if (confirm('Você respondeu todas as 30 questões! Deseja finalizar a prova agora?')) {
          resultado();
        }
        return;
      }
      var nx = proximaPendente();
      if (nx >= 0) {
        atual = nx;
      } else if (atual < questoes.length - 1) {
        atual++;
      }
      renderQuestao();
    };
  }

  function resultado() {
    clearInterval(tid);
    var certas = resp.filter(function(r, i) { return r === questoes[i].ok; }).length;
    var minAprov = prova.minimoAprovacao || 21;
    var aprovado = certas >= minAprov;
    var pct = Math.round((certas / questoes.length) * 100);

    document.getElementById('app').innerHTML =
      '<section class="section"><div class="sim-result"><div class="sim-res-card">' +
        '<span class="eyebrow"><i class="fa-solid fa-clipboard-check"></i> Resultado do Simulado</span>' +
        '<div class="sim-res-score ' + (aprovado ? 'sok' : 'snok') + '">' + certas + '/' + questoes.length + '</div>' +
        '<span class="sim-res-badge ' + (aprovado ? 'sok' : 'snok') + '">' +
          '<i class="fa-solid fa-' + (aprovado ? 'check' : 'xmark') + '"></i> ' +
          (aprovado ? 'APROVADO — Parabéns!' : 'REPROVADO — Continue praticando!') +
        '</span>' +
        '<div class="sim-res-stats">' +
          '<div class="sim-stat"><strong style="color:#059669">' + certas + '</strong><span>Acertos</span></div>' +
          '<div class="sim-stat"><strong style="color:#e11d48">' + (questoes.length - certas) + '</strong><span>Erros</span></div>' +
          '<div class="sim-stat"><strong>' + pct + '%</strong><span>Aproveitamento</span></div>' +
        '</div>' +
        '<p style="color:var(--muted);font-size:14px;margin-bottom:24px">O mínimo para aprovação oficial no Detran é de <strong>' + minAprov + ' acertos (70%)</strong> em 30 questões.</p>' +
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:24px 0 36px">' +
          '<a class="btn primary" href="simulado.html?id=' + prova.id + '"><i class="fa-solid fa-rotate-right"></i> Refazer este simulado</a>' +
          '<a class="btn" style="background:var(--navy);color:#fff" href="simulados.html"><i class="fa-solid fa-arrow-left"></i> Escolher outro simulado</a>' +
        '</div>' +
        '<div class="sim-review">' +
          '<h3><i class="fa-solid fa-list-check"></i> Revisão completa da prova</h3>' +
          questoes.map(function(q, i) {
            var r = resp[i];
            var ac = (r === q.ok);
            var imgReview = q.img ? '<div style="margin:8px 0"><img src="' + q.img + '" style="max-height:80px;border-radius:8px;border:1px solid #ddd;padding:4px;background:#fff"></div>' : '';
            return '<div class="sim-r-item ' + (ac ? 'rok' : 'rnok') + '">' +
              '<p><strong>Questão ' + (i + 1) + '</strong> <span style="font-size:12px;color:var(--muted)">(' + (q.mat || prova.materia) + ')</span> — ' + q.txt + '</p>' +
              imgReview +
              (r !== null
                ? '<p class="rans ' + (ac ? 'rok' : 'rnok') + '"><i class="fa-solid fa-' + (ac ? 'check' : 'xmark') + '"></i> Sua resposta: ' + q.ops[r] + '</p>'
                : '<p class="rans rnok"><i class="fa-solid fa-clock"></i> Questão não respondida</p>') +
              (!ac ? '<p class="rcor"><i class="fa-solid fa-check"></i> Resposta correta: ' + q.ops[q.ok] + '</p>' : '') +
            '</div>';
          }).join('') +
        '</div>' +
      '</div></div></section>';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Header do simulado
  document.getElementById('sim-title').textContent = (prova.titulo || ('Simulado ' + prova.id)) + ' · ' + questoes.length + ' questões';
  document.getElementById('sclock').textContent = fmt(seg);

  document.getElementById('sexit').onclick = function() {
    if (confirm('Deseja sair do simulado? O seu progresso atual será perdido.')) {
      location.href = 'simulados.html';
    }
  };

  tid = setInterval(function() {
    seg--;
    var el = document.getElementById('sclock');
    if (el) {
      el.textContent = fmt(seg);
      if (seg <= 300) el.classList.add('urgente');
    }
    if (seg <= 0) {
      clearInterval(tid);
      alert('O tempo de 60 minutos se esgotou! Vamos ver o seu resultado.');
      resultado();
    }
  }, 1000);

  renderQuestao();
}());
