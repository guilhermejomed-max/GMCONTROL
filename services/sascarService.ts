import * as soap from 'soap';

const SASCAR_WSDL = 'https://ws.sascar.com.br/WSSascar/SascarService?wsdl';

// Cache em memória (persistente enquanto a instância estiver quente)
export const sascarCache = {
  positions: new Map<string, any>(),
  lastFullUpdate: 0
};

let soapClient: any = null;

async function getClient() {
  if (!soapClient) {
    soapClient = await soap.createClientAsync(SASCAR_WSDL);
  }
  return soapClient;
}

export async function fetchVehicleData(plate?: string) {
  const client = await getClient();
  const auth = { login: process.env.SASCAR_USER, senha: process.env.SASCAR_PASSWORD };

  // 1. Obter lista de veículos (Rápido)
  const [vResult] = await client.obterVeiculosAsync(auth);
  const vehicles = vResult.return || [];

  // 2. Se uma placa específica foi pedida, foca nela para economizar tempo
  if (plate) {
    const target = vehicles.find((v: any) => v.placa === plate);
    if (target) {
      const [pos] = await client.obterUltimaPosicaoVeiculoAsync({ ...auth, idVeiculo: target.id });
      const data = { ...pos.return, placa: target.placa, id: target.id };
      sascarCache.positions.set(plate, data);
      return [data];
    }
  }

  // 3. Fallback: Retorna o que tem no cache para não dar timeout
  return Array.from(sascarCache.positions.values());
}
