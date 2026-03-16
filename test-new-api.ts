import axios from 'axios';

async function testNewApi() {
  const url = 'https://api.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl';
  console.log(`Checking ${url}...`);
  try {
    const response = await axios.get(url);
    console.log('Success! WSDL found.');
    console.log(response.data.substring(0, 500));
  } catch (e: any) {
    console.error(`Failed to reach WSDL at ${url}: ${e.message}`);
    
    const baseUrl = 'https://api.sascar.com.br';
    console.log(`Checking base URL ${baseUrl}...`);
    try {
      const resp2 = await axios.get(baseUrl);
      console.log(`Base URL response: ${resp2.status}`);
    } catch (e2: any) {
      console.error(`Base URL failed: ${e2.message}`);
    }
  }
}

testNewApi();
