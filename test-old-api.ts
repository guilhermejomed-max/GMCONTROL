import axios from 'axios';

async function testOldApi() {
  const url = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl';
  console.log(`Checking ${url}...`);
  try {
    const response = await axios.get(url);
    console.log('Success! WSDL found.');
    console.log(response.data.substring(0, 500));
  } catch (e: any) {
    console.error(`Failed to reach WSDL at ${url}: ${e.message}`);
  }
}

testOldApi();
