import fetch from 'node-fetch';

const user = 'JOMEDELOGTORREOPENTECH';
const pass = 'sascar';
const url = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService';

async function fetchSoap(method: string, bodyContent: string) {
  const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:${method}>
         <usuario>${user}</usuario>
         <senha>${pass}</senha>
         ${bodyContent}
      </int:${method}>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
      body: soapEnvelope
    });
    const text = await response.text();
    return text;
  } catch (e) {
    console.error(e);
    return null;
  }
}

import fs from 'fs';

async function run() {
  console.log("Testing obterPacotePosicoesJSON...");
  const jsonPosicoes = await fetchSoap('obterPacotePosicoesJSON', '<quantidade>10</quantidade>');
  console.log(jsonPosicoes);
}

run();
