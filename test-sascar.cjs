const fetch = require('node-fetch');

const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:obterPacotePosicoesRestricao>
         <usuario>JOMEDELOGTORREOPENTECH</usuario>
         <senha>sascar</senha>
         <quantidade>1</quantidade>
         <idVeiculo>2194837</idVeiculo>
      </int:obterPacotePosicoesRestricao>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

fetch('https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService', {
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml;charset=UTF-8'
  },
  body: soapEnvelope
})
.then(res => res.text())
.then(text => {
    console.log("Response:", text);
})
.catch(err => console.error(err));
