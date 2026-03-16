import axios from 'axios';
import { parseStringPromise } from 'xml2js';

async function test() {
  const SASCAR_USER = process.env.SASCAR_USER || 'jomed';
  const SASCAR_PASS = process.env.SASCAR_PASS || 'Jomed@2025';
  const platesXml = '<placa>MFH7864</placa>';

  const xmlPayload = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://webservice.web.integracao.sascar.com.br/">
       <soapenv:Header/>
       <soapenv:Body>
          <ws:obterVeiculosJson>
             <usuario>jomed</usuario>
             <senha>Jomed@2025</senha>
          </ws:obterVeiculosJson>
       </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await axios.post(
      'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService',
      xmlPayload,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': '""'
        }
      }
    );
    console.log(response.data.substring(0, 1000));
  } catch (e: any) {
    console.error(e.message);
  }
}

test();
