import axios from "axios";
import fs from "fs";
import { parseStringPromise } from "xml2js";

async function run() {
  try {
    const SASCAR_USER = process.env.SASCAR_USER || "JOMEDELOGTORREOPENTECH";
    const SASCAR_PASS = process.env.SASCAR_PASS || "sascar";

    const xmlPayload = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://webservice.web.integracao.sascar.com.br/">
         <soapenv:Header/>
         <soapenv:Body>
            <ws:obterVeiculosJson>
               <usuario>${SASCAR_USER}</usuario>
               <senha>${SASCAR_PASS}</senha>
               <quantidade>100</quantidade>
            </ws:obterVeiculosJson>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await axios.post(
      'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService',
      xmlPayload,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': '""'
        },
        timeout: 15000
      }
    );

    const result = await parseStringPromise(response.data);

    fs.writeFileSync('sascar-localizacao-debug.xml', response.data);
    console.log("Saved to sascar-localizacao-debug.xml");
  } catch (err: any) {
    console.error(err.message);
    if (err.response) {
      console.error(err.response.data);
    }
  }
}

run();
