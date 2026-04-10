const fetch = require('node-fetch');

const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:obterVeiculos>
         <usuario>JOMEDELOGTORREOPENTECH</usuario>
         <senha>sascar</senha>
         <quantidade>5000</quantidade>
      </int:obterVeiculos>
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
    console.log("Response length:", text.length);
    const match = text.match(/<return>(.*?)<\/return>/);
    if (match) {
        console.log("First vehicle:", match[1]);
    }
})
.catch(err => console.error(err));
