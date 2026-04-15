import fetch from 'node-fetch';

const user = 'JOMEDELOGTORREOPENTECH';
const pass = 'sascar';
const url = 'https://webservice.web.sascar.com.br/SasIntegraWSService';

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

async function run() {
  console.log("Fetching obterUltimaPosicaoTodosVeiculos...");
  const res1 = await fetchSoap('obterUltimaPosicaoTodosVeiculos', '');
  if (res1) {
    const match = res1.match(/<litrometro2>(.*?)<\/litrometro2>/);
    const match2 = res1.match(/<consumoCombustivel>(.*?)<\/consumoCombustivel>/);
    console.log("obterUltimaPosicaoTodosVeiculos litrometro2:", match ? match[1] : "not found");
    console.log("obterUltimaPosicaoTodosVeiculos consumoCombustivel:", match2 ? match2[1] : "not found");
  }

  console.log("Fetching obterPacotePosicoesComPlaca...");
  const res2 = await fetchSoap('obterPacotePosicoesComPlaca', '<quantidade>10</quantidade>');
  if (res2) {
    const match = res2.match(/<litrometro2>(.*?)<\/litrometro2>/);
    const match2 = res2.match(/<consumoCombustivel>(.*?)<\/consumoCombustivel>/);
    console.log("obterPacotePosicoesComPlaca litrometro2:", match ? match[1] : "not found");
    console.log("obterPacotePosicoesComPlaca consumoCombustivel:", match2 ? match2[1] : "not found");
  }

  console.log("Fetching obterDeltaTelemetriaIntegracao...");
  const idMatch = res1?.match(/<idVeiculo>(.*?)<\/idVeiculo>/);
  if (idMatch) {
    const idVeiculo = idMatch[1];
    console.log("Using idVeiculo:", idVeiculo);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const format = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const body = `
      <dataInicio>${format(yesterday)}</dataInicio>
      <dataFinal>${format(today)}</dataFinal>
      <idVeiculo>${idVeiculo}</idVeiculo>
    `;
    const res3 = await fetchSoap('obterDeltaTelemetriaIntegracao', body);
    if (res3) {
      const match = res3.match(/<consumoCombustivel>(.*?)<\/consumoCombustivel>/);
      console.log("obterDeltaTelemetriaIntegracao consumoCombustivel:", match ? match[1] : "not found");
    }
  }
}

run();
