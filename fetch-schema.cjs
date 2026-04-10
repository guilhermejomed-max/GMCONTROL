const fetch = require('node-fetch');

fetch('https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?xsd=1')
.then(res => res.text())
.then(text => {
    const fs = require('fs');
    fs.writeFileSync('sascar-schema.xml', text);
    console.log("Schema saved.");
})
.catch(err => console.error(err));
