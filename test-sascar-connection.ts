import soap from "soap";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const SASCAR_USER = process.env.SASCAR_USER || "JOMEDELOGTORREOPENTECH";
const SASCAR_PASS = process.env.SASCAR_PASS || "sascar";
const SASCAR_WSDL_LOCAL = path.join(process.cwd(), 'sascar-wsdl.xml');

async function test() {
    console.log("Testing Sascar connection...");
    console.log("User:", SASCAR_USER);
    console.log("WSDL Path:", SASCAR_WSDL_LOCAL);

    try {
        const client = await soap.createClientAsync(SASCAR_WSDL_LOCAL);
        console.log("SOAP Client created successfully.");

        console.log("Calling obterPacotePosicoesJSONAsync...");
        const [result] = await client.obterPacotePosicoesJSONAsync({
            usuario: SASCAR_USER,
            senha: SASCAR_PASS,
            quantidade: 10
        });

        console.log("Result received:");
        console.log(JSON.stringify(result, null, 2));

        const frotaEmTexto = result.return || result.retornar;
        if (frotaEmTexto) {
            console.log("Data found!");
            const frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
            console.log("Number of items:", frotaArray.length);
            console.log("First item sample:", JSON.stringify(frotaArray[0]).substring(0, 200));
        } else {
            console.log("No data returned in 'return' or 'retornar' fields.");
        }
    } catch (error: any) {
        console.error("Error during test:", error.message);
        if (error.stack) console.error(error.stack);
    }
}

test();
