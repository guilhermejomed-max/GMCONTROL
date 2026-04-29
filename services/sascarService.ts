import axios from 'axios';
import * as soap from 'soap';

// Configurações e Tipos
const SASCAR_WSDL = 'https://ws.sascar.com.br/WSSascar/SascarService?wsdl';
const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutos

interface SascarCache {
  latestPositions: Map<string, any>;
  idToPlateMap: Map<string, string>;
  lastUpdate: number;
  isUpdating: boolean;
}

// Cache global único para evitar redundância
export const sascarCache: SascarCache = {
  latestPositions: new Map(),
  idToPlateMap: new Map(),
  lastUpdate: 0,
  isUpdating: false
};

let soapClient: any = null;

async function getSoapClient() {
  if (soapClient) return soapClient;
  soapClient = await soap.createClientAsync(SASCAR_WSDL);
  return soapClient;
}

export async function performFetch() {
  if (sascarCache.isUpdating) return;
  
  sascarCache.isUpdating = true;
  try {
    const client = await getSoapClient();
    const user = process.env.SASCAR_USER;
    const password = process.env.SASCAR_PASSWORD;

    // Busca todos os veículos
    const [result] = await client.obterVeiculosAsync({ login: user, senha: password });
    const vehicles = result.return || [];

    for (const vehicle of vehicles) {
      // Mapeia ID para Placa para consultas rápidas
      sascarCache.idToPlateMap.set(vehicle.id.toString(), vehicle.placa);

      // Busca posição atual
      const [posResult] = await client.obterUltimaPosicaoVeiculoAsync({ 
        login: user, 
        senha: password, 
        idVeiculo: vehicle.id 
      });

      if (posResult.return) {
        sascarCache.latestPositions.set(vehicle.id.toString(), {
          ...posResult.return,
          placa: vehicle.placa,
          lastSeen: Date.now()
        });
      }
    }
    
    sascarCache.lastUpdate = Date.now();
    console.log(`Cache atualizado: ${sascarCache.latestPositions.size} veículos.`);
  } catch (error) {
    console.error('Erro ao atualizar cache Sascar:', error);
  } finally {
    sascarCache.isUpdating = false;
  }
}
