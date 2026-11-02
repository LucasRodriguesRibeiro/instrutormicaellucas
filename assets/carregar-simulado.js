(function(){
  'use strict';
  var params=new URLSearchParams(location.search);
  var id=Number(params.get('id')||1);
  if(!Number.isInteger(id)||id<1||id>25)id=1;

  function iniciar(){
    var motor=document.createElement('script');
    motor.src='assets/simulado.js';
    document.body.appendChild(motor);
  }

  var dados=document.createElement('script');
  dados.src='data/simulado-'+id+'.js';
  dados.onload=iniciar;
  dados.onerror=iniciar;
  document.body.appendChild(dados);
}());
