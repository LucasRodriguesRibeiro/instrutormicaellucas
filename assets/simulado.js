(function(){
  'use strict';

  var prova=window.SIMULADO;
  if(!prova||!Array.isArray(prova.questoes)){
    document.getElementById('app').innerHTML='<div class="sim-result"><div class="sim-res-card"><h1>Simulado indisponível</h1><p>Não foi possível carregar as questões.</p><a class="btn primary" href="simulados.html">Voltar aos simulados</a></div></div>';
    return;
  }

  var questoes=prova.questoes;
  var resp=new Array(questoes.length).fill(null);
  var atual=0;
  var seg=prova.duracao*60;
  var tid=null;

  function fmt(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
  function feitas(){return resp.filter(function(r){return r!==null;}).length;}
  function proximaPendente(){
    for(var i=atual+1;i<questoes.length;i++)if(resp[i]===null)return i;
    for(var j=0;j<atual;j++)if(resp[j]===null)return j;
    return -1;
  }

  function renderQuestao(){
    var q=questoes[atual];
    var totalFeitas=feitas();
    document.getElementById('sqa').innerHTML=
      '<div class="sim-q-meta"><span class="sim-q-label">Questão '+(atual+1)+' de '+questoes.length+'</span><span class="sim-q-mat">'+q.mat+'</span></div>'+ 
      '<p class="sim-q-txt">'+q.txt+'</p>'+ 
      '<div class="sim-ops">'+q.ops.map(function(op,i){return '<button class="sim-op'+(resp[atual]===i?' selected':'')+'" data-i="'+i+'">'+op+'</button>';}).join('')+'</div>'+ 
      '<div class="sim-nav"><button class="sim-nav-btn" id="sp" '+(atual===0?'disabled':'')+'><i class="fa-solid fa-arrow-left"></i> Anterior</button><button class="sim-skip" id="skip">Pular <i class="fa-solid fa-arrow-right"></i></button><button class="sim-nav-btn snext" id="sn">'+(totalFeitas===questoes.length?'<i class="fa-solid fa-flag-checkered"></i> Finalizar prova':'Responder <i class="fa-solid fa-arrow-right"></i>')+'</button></div>';
    document.getElementById('spg').textContent=totalFeitas+'/'+questoes.length+' respondidas';
    document.getElementById('sgd').innerHTML=questoes.map(function(_,i){var c='sim-q-btn';if(i===atual)c+=' sqcur';if(resp[i]!==null)c+=' sqok';return '<button class="'+c+'" data-q="'+i+'">'+(i+1)+'</button>';}).join('');

    document.querySelectorAll('.sim-op').forEach(function(b){b.onclick=function(){resp[atual]=Number(b.dataset.i);renderQuestao();};});
    document.querySelectorAll('.sim-q-btn').forEach(function(b){b.onclick=function(){atual=Number(b.dataset.q);renderQuestao();};});
    document.getElementById('sp').onclick=function(){if(atual>0){atual--;renderQuestao();}};
    document.getElementById('skip').onclick=function(){var nx=proximaPendente();if(nx>=0){atual=nx;renderQuestao();}else alert('Todas as questões já foram respondidas!');};
    document.getElementById('sn').onclick=function(){
      if(totalFeitas===questoes.length){resultado();return;}
      if(resp[atual]===null){alert('Selecione uma alternativa antes de responder.');return;}
      var nx=proximaPendente();
      if(nx>=0){atual=nx;renderQuestao();}
    };
  }

  function resultado(){
    clearInterval(tid);
    var certas=resp.filter(function(r,i){return r===questoes[i].ok;}).length;
    var aprovado=certas>=prova.minimoAprovacao;
    var pct=Math.round(certas/questoes.length*100);
    document.getElementById('app').innerHTML='<section class="section"><div class="sim-result"><div class="sim-res-card">'+
      '<span class="eyebrow"><i class="fa-solid fa-clipboard-check"></i> Resultado do Simulado</span><div class="sim-res-score '+(aprovado?'sok':'snok')+'">'+certas+'/'+questoes.length+'</div><span class="sim-res-badge '+(aprovado?'sok':'snok')+'"><i class="fa-solid fa-'+(aprovado?'check':'xmark')+'"></i> '+(aprovado?'APROVADO — Bom trabalho!':'REPROVADO — Continue estudando!')+'</span>'+ 
      '<div class="sim-res-stats"><div class="sim-stat"><strong style="color:#059669">'+certas+'</strong><span>Acertos</span></div><div class="sim-stat"><strong style="color:#e11d48">'+(questoes.length-certas)+'</strong><span>Erros</span></div><div class="sim-stat"><strong>'+pct+'%</strong><span>Aproveitamento</span></div></div>'+ 
      '<p>O mínimo para aprovação neste simulado é <strong>'+prova.minimoAprovacao+' acertos</strong>.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:24px 0 36px"><a class="btn primary" href="simulado.html?id='+prova.id+'"><i class="fa-solid fa-rotate-right"></i> Refazer</a><a class="btn" style="background:var(--navy);color:#fff" href="simulados.html"><i class="fa-solid fa-arrow-left"></i> Outros simulados</a></div>'+ 
      '<div class="sim-review"><h3>Revisão das questões</h3>'+questoes.map(function(q,i){var r=resp[i],ac=r===q.ok;return '<div class="sim-r-item '+(ac?'rok':'')+'"><p><strong>Q'+(i+1)+'</strong> — '+q.txt+'</p>'+(r!==null?'<p class="rans '+(ac?'rok':'rnok')+'">Sua resposta: '+q.ops[r]+'</p>':'<p class="rans rnok">Não respondida</p>')+(!ac?'<p class="rcor">Resposta correta: '+q.ops[q.ok]+'</p>':'')+'</div>';}).join('')+'</div></div></div></section>';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  document.getElementById('sim-title').textContent=prova.titulo+' · '+questoes.length+' questões';
  document.getElementById('sclock').textContent=fmt(seg);
  document.getElementById('sexit').onclick=function(){if(confirm('Deseja sair do simulado? Seu progresso será perdido.'))location.href='simulados.html';};
  tid=setInterval(function(){seg--;var el=document.getElementById('sclock');el.textContent=fmt(seg);if(seg<=300)el.classList.add('urgente');if(seg<=0)resultado();},1000);
  renderQuestao();
}());
