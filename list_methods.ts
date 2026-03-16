import soap from 'soap';

async function listMethods() {
  const client = await soap.createClientAsync('https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl');
  
  const SASCAR_USER = process.env.SASCAR_USER || "JOMEDELOGTORREOPENTECH";
  const SASCAR_PASS = process.env.SASCAR_PASS || "sascar";

  const res = await client.obterPacotePosicaoHistoricoAsync({
    usuario: SASCAR_USER,
    senha: SASCAR_PASS,
    idVeiculo: 520485,
    dataInicio: '2026-03-12 00:00:00',
    dataFinal: '2026-03-13 23:59:59'
  });
  
  const frotaEmTexto = res[0].return || res[0].retornar;
  if (frotaEmTexto) {
      const frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
      console.log(`Total items: ${frotaArray.length}`);
      if (frotaArray.length > 0) {
          console.log('Last item:', JSON.stringify(frotaArray[frotaArray.length - 1], null, 2));
      }
  } else {
      console.log('No data returned');
  }
}

listMethods();
