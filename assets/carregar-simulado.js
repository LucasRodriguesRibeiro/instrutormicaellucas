(function(){
  'use strict';
  var params = new URLSearchParams(location.search);
  var id = Number(params.get('id') || 38);
  if (!Number.isInteger(id) || id < 1 || id > 48) id = 38;

  function iniciar() {
    // Definir window.SIMULADO a partir de window.PROVA_ATUAL se existir
    if (window.PROVA_ATUAL) {
      window.SIMULADO = window.PROVA_ATUAL;
    }
    var motor = document.createElement('script');
    motor.src = 'assets/simulado.js';
    document.body.appendChild(motor);
  }

  var dados = document.createElement('script');
  dados.src = 'data/provas/prova_' + id + '.js';
  dados.onload = iniciar;
  dados.onerror = function() {
    // Fallback para simulado-1 antigo se falhar
    var fallback = document.createElement('script');
    fallback.src = 'data/simulado-1.js';
    fallback.onload = iniciar;
    fallback.onerror = iniciar;
    document.body.appendChild(fallback);
  };
  document.body.appendChild(dados);
}());
