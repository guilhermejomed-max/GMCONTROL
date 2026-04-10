const fetch = require('node-fetch');

const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:obterPacotePosicoesComPlaca>
         <usuario>JOMEDELOGTORREOPENTECH</usuario>
         <senha>sascar</senha>
         <quantidade>20000</quantidade>
      </int:obterPacotePosicoesComPlaca>
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
    const matches = text.match(/<return>/g);
    console.log("Number of items:", matches ? matches.length : 0);
})
.catch(err => console.error(err));
