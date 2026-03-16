import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import soap from "soap";
import path from "path";
import fs from "fs";

dotenv.config();

const logFile = path.join(process.cwd(), 'server-debug.log');
function logToFile(msg: string) {
  const time = new Date().toISOString();
  fs.appendFileSync(logFile, `[${time}] ${msg}\n`);
  console.log(msg);
}

// Prevent server crashes from unhandled socket errors (like EPIPE)
process.on('uncaughtException', (err) => {
  logToFile(`Uncaught Exception: ${err.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logToFile(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

function parseSascarDate(dateStr: any): Date {
    if (!dateStr) return new Date();
    
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? new Date() : dateStr;
    }

    // Se já for um número (timestamp)
    if (typeof dateStr === 'number') {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    const str = String(dateStr).trim();
    if (!str) return new Date();

    // Se for um timestamp em string
    if (/^\d+$/.test(str)) {
        const d = new Date(parseInt(str));
        return isNaN(d.getTime()) ? new Date() : d;
    }

    // Se já for ISO
    if (str.includes('T') && !isNaN(new Date(str).getTime())) {
        return new Date(str);
    }

    // Remove milissegundos extras que a Sascar envia (ex: "2026-03-15 00:43:32.0")
    const cleanStr = str.split('.')[0];

    // Formato comum Sascar: "DD/MM/YYYY HH:MM:SS" ou "YYYY-MM-DD HH:MM:SS"
    const parts = cleanStr.match(/(\d+)/g);
    if (parts && parts.length >= 3) {
        let day, month, year, hour = "00", min = "00", sec = "00";

        if (parts[0].length === 4) {
            // YYYY-MM-DD
            year = parts[0];
            month = parts[1];
            day = parts[2];
        } else {
            // DD/MM/YYYY
            day = parts[0];
            month = parts[1];
            year = parts[2];
        }

        if (parts.length >= 6) {
            hour = parts[3];
            min = parts[4];
            sec = parts[5];
        }

        try {
            // Assumindo fuso horário de Brasília (-03:00) para os dados da Sascar
            const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:${sec.padStart(2, '0')}-03:00`;
            const d = new Date(iso);
            if (!isNaN(d.getTime())) return d;
        } catch (e) {}
    }

    // Tenta parsing padrão se tudo falhar
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
        return d;
    }

    return new Date(0); // Retorna data antiga para o filtro ignorar esse pacote
}

function parseSascarVehicle(raw: any): any {
    console.log("[Sascar Debug] Raw Data:", JSON.stringify(raw));
    let sv = raw;
    if (typeof sv === 'string') {
        try {
            sv = JSON.parse(sv);
            if (typeof sv === 'string') sv = JSON.parse(sv);
        } catch(e) { return null; }
    }

    if (typeof sv === 'object' && sv !== null) {
        // 1. Pega os valores brutos
        let lat = parseFloat(sv.latitude || sv.lat || sv.posicao?.latitude || 0);
        let lng = parseFloat(sv.longitude || sv.lng || sv.posicao?.longitude || 0);

        // 2. Se vier como inteiro gigante (ex: -23550000), transforma em decimal
        if (Math.abs(lat) > 1000) lat /= 1000000;
        if (Math.abs(lng) > 1000) lng /= 1000000;

        // 3. GARANTE SINAL NEGATIVO (Brasil: Lat - e Lng -)
        // Isso evita que o caminhão vá para a África ou Europa
        if (lat > 0) lat = -lat;
        if (lng > 0) lng = -lng;

        const result = {
            ...sv,
            idVeiculo: sv.idVeiculo || sv.id,
            placa: sv.placa || sv.plate,
            latitude: lat,
            longitude: lng,
            odometroExato: parseFloat(sv.odometroExato || sv.odometro || 0),
            dataPosicaoIso: parseSascarDate(sv.dataPosicao || sv.dataHora).toISOString()
        };
        console.log("[Sascar Debug] Parsed Data:", JSON.stringify(result));
        return result;
    }
    return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    logToFile(`[Server] ${req.method} ${req.url}`);
    next();
  });

  // Sascar API credentials from environment variables
  const SASCAR_USER = process.env.SASCAR_USER || "JOMEDELOGTORREOPENTECH";
  const SASCAR_PASS = process.env.SASCAR_PASS || "sascar";
  const SASCAR_WSDL_URL = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl';
  const SASCAR_WSDL_LOCAL = path.join(process.cwd(), 'sascar-wsdl.xml');
  const SASCAR_WSDL = SASCAR_WSDL_LOCAL; // Prefer local WSDL to avoid fetch errors

  const soapClients = new Map<string, any>();
  let sascarRequestLock = Promise.resolve();

  // Cache for Sascar API results to optimize chunked requests from frontend
  let sascarCache = {
      idToPlateMap: new Map<string, string>(),
      latestPositions: new Map<string, any>(),
      lastFetchTime: 0,
      lastMapFetchTime: 0,
      fetchPromise: null as Promise<void> | null
  };

  async function synchronizedSascarCall<T>(fn: () => Promise<T>): Promise<T> {
    const currentLock = sascarRequestLock;
    let resolveLock: () => void;
    sascarRequestLock = new Promise((resolve) => {
      resolveLock = resolve;
    });

    try {
      await currentLock;
      // Add a small delay between any two Sascar calls to be safe
      await new Promise(resolve => setTimeout(resolve, 50));
      return await fn();
    } finally {
      // @ts-ignore
      if (resolveLock) resolveLock();
    }
  }

  async function getSoapClient(wsdl: string) {
    // If it's the default URL, use the local file instead
    const targetWsdl = wsdl === SASCAR_WSDL_URL ? SASCAR_WSDL_LOCAL : wsdl;
    
    if (!soapClients.has(targetWsdl)) {
      console.log(`[Sascar] Criando cliente SOAP para: ${targetWsdl}`);
      try {
        const client = await soap.createClientAsync(targetWsdl, {
          disableCache: false
        });
        soapClients.set(targetWsdl, client);
      } catch (error: any) {
        console.error(`[Sascar] Erro ao criar cliente SOAP (${targetWsdl}):`, error.message);
        throw error;
      }
    }
    return soapClients.get(targetWsdl);
  }

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  /**
   * Função para drenar a fila FIFO da Sascar até alcançar o tempo real.
   * Descarta pacotes antigos e só começa a salvar quando atingir a data de hoje ou a fila esvaziar.
   */
  async function drainSascarQueue(
      user: string, 
      pass: string, 
      client: any, 
      latestPositions: Map<string, any>, 
      idToPlateMap: Map<string, string>,
      maxIterations: number,
      fetchStartTime: number,
      currentTimeout: number
  ) {
      logToFile(`[Sascar] INICIANDO DRENAGEM DA FILA FIFO...`);
      
      let total = 0;
      let iterations = 0;
      
      // Data alvo: Hoje (início do dia)
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let reachedRealTime = false;
      let hasMore = true;

      while (hasMore && iterations < maxIterations) {
          if (Date.now() - fetchStartTime > currentTimeout) {
              logToFile(`[Sascar] Timeout iminente (${currentTimeout}ms). Interrompendo limpeza da fila na iteração ${iterations}.`);
              break;
          }
          
          iterations++;
          try {
              const result = await synchronizedSascarCall(() => 
                  client.obterPacotePosicoesJSONAsync({
                      usuario: user,
                      senha: pass,
                      quantidade: 5000
                  }, { timeout: 60000 }).then(([res]: any) => res)
              ) as any;
              
              const frotaEmTexto = result ? (result.return || result.retornar) : null;
              if (frotaEmTexto) {
                  let frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
                  
                  // Se os itens vierem como string JSON, faz o parse do primeiro e último para log
                  if (frotaArray.length > 0) {
                      const parseItem = (item: any) => {
                          if (typeof item === 'string') {
                              try { return JSON.parse(item); } catch(e) { return {}; }
                          }
                          return item;
                      };

                      const firstItem = parseItem(frotaArray[0]);
                      const lastItem = parseItem(frotaArray[frotaArray.length - 1]);

                      const firstDate = parseSascarDate(firstItem.dataPosicao || firstItem.dataHora);
                      const lastDate = parseSascarDate(lastItem.dataPosicao || lastItem.dataHora);
                      
                      const delayMs = now.getTime() - lastDate.getTime();
                      const delayHours = (delayMs / (1000 * 60 * 60)).toFixed(2);

                      logToFile(`[Sascar Drenagem] Lote ${iterations}: ${frotaArray.length} posições.`);
                      logToFile(`[Sascar Drenagem] -> Primeira pos: ${firstDate.toISOString()}`);
                      logToFile(`[Sascar Drenagem] -> Última pos: ${lastDate.toISOString()} (Atraso: ${delayHours} horas)`);

                      // Verifica se já alcançamos pacotes de hoje
                      if (lastDate >= targetDate) {
                          if (!reachedRealTime) {
                              logToFile(`[Sascar Drenagem] Alcançamos o tempo real (dados de hoje)! Começando a salvar posições.`);
                          }
                          reachedRealTime = true;
                      }
                  }
                  
                  total += frotaArray.length;
                  
                  // Processa os itens do lote
                  for (const item of frotaArray) {
                      let sv = item;
                      if (typeof item === 'string') {
                          try { sv = JSON.parse(item); if (typeof sv === 'string') sv = JSON.parse(sv); } catch (e) { continue; }
                      }
                      
                      const itemDate = parseSascarDate(sv.dataPosicao || sv.dataHora);
                      
                      // Sempre sobrescreve com a posição mais recente da fila
                      const idVeiculo = String(sv.idVeiculo || sv.id || "");
                      if (idVeiculo) {
                          if (!sv.placa && idToPlateMap.has(idVeiculo)) {
                              sv.placa = idToPlateMap.get(idVeiculo);
                          }
                          latestPositions.set(idVeiculo, sv);
                      }
                  }
                  
                  // Se retornou menos que 500, a fila esvaziou
                  if (frotaArray.length < 500) {
                      logToFile(`[Sascar Drenagem] Fila esvaziada (retornou ${frotaArray.length} itens).`);
                      hasMore = false;
                  }
              } else {
                  logToFile(`[Sascar Drenagem] Fila vazia.`);
                  hasMore = false;
              }
          } catch (error: any) {
              logToFile(`[Sascar Drenagem] Erro na iteração ${iterations}: ${error.message}`);
              hasMore = false; // Para em caso de erro para não ficar em loop infinito falhando
          }
      }
      
      logToFile(`[Sascar Drenagem] Finalizada. Total consumido: ${total} pacotes em ${iterations} iterações. Veículos únicos salvos: ${latestPositions.size}`);
      return { total_flushed: total, iterations, reachedRealTime };
  }

  app.get("/api/sascar/flush", async (req, res) => {
      const user = "JOMEDELOGTORREOPENTECH";
      const pass = "sascar";
      
      try {
          const client = await getSoapClient("https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl");
          const start = Date.now();
          // Para o flush manual, usamos mapas temporários
          const tempPositions = new Map();
          const tempMap = new Map();
          const stats = await drainSascarQueue(user, pass, client, tempPositions, tempMap, 100, start, 10 * 60 * 1000);
          res.json({ status: "success", ...stats, time_ms: Date.now() - start });
      } catch (error: any) {
          logToFile(`[Sascar] Erro no Flush endpoint: ${error.message}`);
          res.status(500).json({ status: "error", message: error.message });
      }
  });

  // Debug route to fetch raw XML from Sascar
  app.get("/api/sascar/debug", async (req, res) => {
    try {
      const wsdl = SASCAR_WSDL;
      const client = await getSoapClient(wsdl);
      
      const result = await synchronizedSascarCall(() => 
        client.obterPacotePosicoesJSONAsync({
          usuario: SASCAR_USER,
          senha: SASCAR_PASS,
          quantidade: 10
        }, { timeout: 60000 }).then(([res]: any) => res)
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("Sascar Debug Error:", error.message);
      res.status(500).send(error.message);
    }
  });

  // Example route to fetch vehicles from Sascar
  app.post("/api/sascar/vehicles", async (req, res) => {
    logToFile("[Server] Received request for /api/sascar/vehicles");
    let user = SASCAR_USER;
    try {
      const platesQuery = req.body.plates;
      const trackerSettings = req.body.trackerSettings;
      
      logToFile(`[Server] Request body: ${JSON.stringify(req.body)}`);
      
      user = trackerSettings?.user || SASCAR_USER;
      const pass = trackerSettings?.pass || SASCAR_PASS;
      const wsdl = trackerSettings?.wsdl || SASCAR_WSDL;
      
      logToFile(`[Server] Attempting to get SOAP client for user: ${user}`);
      const client = await getSoapClient(wsdl);
      logToFile("[Server] SOAP client obtained successfully");
      
      let allVehiclesRaw: any[] = [];
      let latestPositions = new Map<string, any>();
      let idToPlateMap = new Map<string, string>();

      // Aumentar o timeout da requisição para evitar "Failed to fetch" no frontend
      const startTime = Date.now();
      const MAX_REQUEST_TIME = 90000; // 90 segundos para dar tempo de buscar histórico
      const CACHE_TTL = 2 * 60 * 1000; // 2 minutos
      const MAP_CACHE_TTL = 60 * 60 * 1000; // 1 hora para o mapa de placas

      const formatDateBRT = (d: Date) => {
          // Subtrai 3 horas do tempo atual em UTC para forçar o horário de Brasília (BRT)
          const brtDate = new Date(d.getTime() - (3 * 60 * 60 * 1000));
          const pad = (n: number) => n.toString().padStart(2, '0');
          return `${brtDate.getFullYear()}-${pad(brtDate.getMonth() + 1)}-${pad(brtDate.getDate())} ${pad(brtDate.getHours())}:${pad(brtDate.getMinutes())}:${pad(brtDate.getSeconds())}`;
      };

      const performFetch = async (isBackground: boolean = false) => {
          const fetchStartTime = Date.now();
          const currentTimeout = isBackground ? 600000 : MAX_REQUEST_TIME; // 10 minutos para background, 25s para foreground

          // 0. Mapeamento de Placas (Cacheado por 1 hora)
          try {
              if (sascarCache.idToPlateMap.size === 0 || (Date.now() - sascarCache.lastMapFetchTime > MAP_CACHE_TTL)) {
                  logToFile(`[Sascar] Buscando lista de veículos para mapeamento de placas...`);
                  const result = await synchronizedSascarCall(() => 
                      client.obterVeiculosJsonAsync({
                          usuario: user,
                          senha: pass,
                          quantidade: 5000
                      }, { timeout: 60000 }).then(([res]: any) => res)
                  ) as any;
                  
                  const veiculosEmTexto = result ? (result.return || result.retornar) : null;
                  if (veiculosEmTexto) {
                      let veiculosArray = [];
                      if (typeof veiculosEmTexto === 'string') {
                          try { veiculosArray = JSON.parse(veiculosEmTexto); } catch(e) {}
                      } else if (Array.isArray(veiculosEmTexto)) {
                          veiculosArray = veiculosEmTexto;
                      }
                      
                      for (const item of veiculosArray) {
                          let v = item;
                          if (typeof item === 'string') {
                              try { v = JSON.parse(item); } catch(e) { continue; }
                          }
                          if (v.idVeiculo && v.placa) {
                              idToPlateMap.set(String(v.idVeiculo), String(v.placa).trim().toUpperCase());
                          }
                      }
                      sascarCache.idToPlateMap = idToPlateMap;
                      sascarCache.lastMapFetchTime = Date.now();
                      logToFile(`[Sascar] Mapeamento concluído. ${idToPlateMap.size} veículos com placa mapeados.`);
                  }
              } else {
                  idToPlateMap = sascarCache.idToPlateMap;
              }
          } catch (error: any) {
              logToFile(`[Sascar] Erro ao buscar lista de veículos: ${error.message}`);
              // Fallback para o que já temos no cache
              idToPlateMap = sascarCache.idToPlateMap;
          }

          // 1. Drenagem da fila (FIFO)
          // NO FOREGROUND: Pulamos a fila (0 iterações) para focar apenas no histórico das placas solicitadas
          // NO BACKGROUND: Limpamos muito (50 iterações) para vencer o backlog agressivamente
          const MAX_QUEUE_ITERATIONS = isBackground ? 50 : 0; 
          
          if (!isBackground) {
              logToFile(`[Sascar] Foreground request: Limpeza de fila limitada a ${MAX_QUEUE_ITERATIONS} para priorizar histórico alvo.`);
          } else {
              logToFile(`[Sascar] Limpando fila de pacotes (FIFO) para usuário ${user}...`);
          }
          
          await drainSascarQueue(
              user, 
              pass, 
              client, 
              latestPositions, 
              idToPlateMap, 
              MAX_QUEUE_ITERATIONS, 
              fetchStartTime, 
              currentTimeout
          );
          
          // Update cache
          sascarCache.idToPlateMap = idToPlateMap;
          sascarCache.latestPositions = new Map(latestPositions);
          sascarCache.lastFetchTime = Date.now();
      };

      if (sascarCache.lastFetchTime > 0) {
          // Temos cache!
          if (Date.now() - sascarCache.lastFetchTime > CACHE_TTL) {
              // Cache expirou, inicia fetch em background (Stale-while-revalidate)
              if (!sascarCache.fetchPromise) {
                  logToFile(`[Sascar] Cache expirado (idade: ${Math.round((Date.now() - sascarCache.lastFetchTime)/1000)}s). Iniciando fetch em background...`);
                  sascarCache.fetchPromise = performFetch(true).finally(() => {
                      sascarCache.fetchPromise = null;
                  });
              }
          } else {
              logToFile(`[Sascar] Usando cache válido (idade: ${Math.round((Date.now() - sascarCache.lastFetchTime)/1000)}s)`);
          }
          idToPlateMap = sascarCache.idToPlateMap;
          latestPositions = new Map(sascarCache.latestPositions); // clone
      } else {
          // Sem cache, precisa esperar
          if (!sascarCache.fetchPromise) {
              sascarCache.fetchPromise = performFetch(false).finally(() => {
                  sascarCache.fetchPromise = null;
              });
          }
          logToFile(`[Sascar] Sem cache. Aguardando fetch global...`);
          try {
              await sascarCache.fetchPromise;
          } catch (e: any) {
              logToFile(`[Sascar] Erro no fetch global: ${e.message}`);
          }
          idToPlateMap = sascarCache.idToPlateMap;
          latestPositions = new Map(sascarCache.latestPositions); // clone
      }

      // 2. Se placas específicas foram pedidas, busca histórico apenas para as que NÃO vieram na fila
      if (platesQuery && Array.isArray(platesQuery) && platesQuery.length > 0) {
          // Create reverse map for plate -> id
          const plateToIdMap = new Map<string, string>();
          for (const [id, plate] of idToPlateMap.entries()) {
              plateToIdMap.set(plate.replace(/[^A-Z0-9]/gi, '').toUpperCase(), id);
          }

          const missingPlates = platesQuery.map(p => String(p).trim()).filter(p => {
              const cleanP = p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
              const id = plateToIdMap.get(cleanP) || p;
              
              const pos = latestPositions.get(id);
              if (!pos) return true; // Não está na fila
              
              return false;
          });
          
          if (missingPlates.length > 0) {
              // Tenta buscar o histórico para todos os ausentes, mas o timeout protege
              const platesToFetch = missingPlates;
              logToFile(`[Sascar] Buscando histórico para ${platesToFetch.length} veículos ausentes na fila...`);
              
              const now = new Date();
              const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 horas atrás
              
              const dataInicio = formatDateBRT(twentyFourHoursAgo);
              const dataFinal = formatDateBRT(now);

              const fetchPromises = missingPlates.map(async (idStr) => {
                  const cleanP = idStr.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                  const resolvedId = plateToIdMap.get(cleanP) || idStr;
                  const idVeiculo = parseInt(resolvedId, 10);
                  if (isNaN(idVeiculo)) return;

                  try {
                      const result = await synchronizedSascarCall(() => 
                          client.obterPacotePosicaoHistoricoAsync({
                              usuario: user,
                              senha: pass,
                              idVeiculo: idVeiculo,
                              dataInicio: dataInicio,
                              dataFinal: dataFinal
                          }, { timeout: 60000 }).then(([res]: any) => res)
                      ) as any;

                      const frotaEmTexto = result ? (result.return || result.retornar) : null;
                      if (frotaEmTexto) {
                          const frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
                          if (frotaArray.length > 0) {
                              let latest = frotaArray[frotaArray.length - 1];
                              if (typeof latest === 'string') {
                                  try { latest = JSON.parse(latest); } catch(e) {}
                              }
                              if (!latest.placa && idToPlateMap.has(String(idVeiculo))) {
                                  latest.placa = idToPlateMap.get(String(idVeiculo));
                              }
                              latestPositions.set(String(idVeiculo), latest);
                              // Update cache so next request doesn't need to fetch it
                              sascarCache.latestPositions.set(String(idVeiculo), latest);
                          }
                      }
                  } catch (error: any) {
                      logToFile(`[Sascar] Erro ao buscar histórico do veículo ${idVeiculo}: ${error.message}`);
                  }
              });

              // Race all promises against the remaining time
              const timeRemaining = MAX_REQUEST_TIME - (Date.now() - startTime);
              if (timeRemaining > 0) {
                  await Promise.race([
                      Promise.all(fetchPromises),
                      new Promise(resolve => setTimeout(() => {
                          logToFile(`[Sascar] Timeout iminente (${timeRemaining}ms). Interrompendo espera do histórico.`);
                          resolve(null);
                      }, timeRemaining))
                  ]);
              } else {
                  logToFile(`[Sascar] Tempo esgotado antes de iniciar busca de histórico.`);
              }
          }
      }

      // 3. Retornar os dados que temos no cache
      allVehiclesRaw = Array.from(latestPositions.values());
      logToFile(`[Sascar] Sincronização de dados concluída. Total de veículos para processar: ${allVehiclesRaw.length}`);
      
      const vehicleMap = new Map<string, any>();
      
      logToFile(`[Sascar] Processando ${allVehiclesRaw.length} itens brutos...`);

      allVehiclesRaw.forEach((rawItem: any) => {
          try {
              let parsed = rawItem;
              if (typeof rawItem === 'string' && (rawItem.trim().startsWith('{') || rawItem.trim().startsWith('['))) {
                  try {
                      parsed = JSON.parse(rawItem);
                  } catch (e) {}
              }
              
              const itemsToProcess = Array.isArray(parsed) ? parsed : [parsed];
              
              itemsToProcess.forEach(item => {
                  const vehicleData = parseSascarVehicle(item);
                  if (!vehicleData) return;

                  // Normalizar placa para chave (remover hífens e espaços)
                  const plate = vehicleData.placa ? vehicleData.placa.replace(/[^A-Z0-9]/gi, '').toUpperCase() : '';
                  const sascarId = vehicleData.idVeiculo ? vehicleData.idVeiculo.toString() : '';
                  
                  // Usar ID como chave primária se disponível, senão placa
                  const key = sascarId || plate;
                  
                  if (!key) return;

                  const existing = vehicleMap.get(key);
                  
                  // Comparação de datas para manter apenas a mais recente
                  const currentDate = vehicleData.dataPosicaoIso ? new Date(vehicleData.dataPosicaoIso).getTime() : 0;
                  const existingDate = existing?.dataPosicaoIso ? new Date(existing.dataPosicaoIso).getTime() : 0;

                  if (!existing || currentDate > existingDate) {
                      vehicleMap.set(key, vehicleData);
                  }
              });
          } catch (e: any) {
              logToFile(`Erro ao processar item bruto da Sascar: ${e.message}`);
          }
      });

      const rawValues = Array.from(vehicleMap.values());
      
      // --- DEBUG: Inspeção do Payload Bruto ---
      logToFile(`[Sascar Debug] Inspecionando payload bruto antes do mapeamento (${rawValues.length} veículos):`);
      rawValues.slice(0, 5).forEach((v: any, index: number) => {
          const rawDate = v.dataPosicao || v.dataHora || 'NENHUMA_DATA';
          logToFile(`[Sascar Debug] Veículo ${index + 1} | Placa/ID: ${v.placa || v.idVeiculo} | dataPosicao bruta: ${rawDate}`);
      });
      // ----------------------------------------

      const processedVehicles = rawValues.map((v: any) => {
          // Extração com fallback para 0 caso o valor venha nulo/undefined
          const rawLat = v.latitude ?? 0;
          const rawLng = v.longitude ?? 0;
          
          // Prioriza odometroExato, com fallback para odometro
          const rawOdometer = v.odometroExato ?? v.odometro ?? 0;

          return {
              idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '', 
              placa: v.placa || '',
              plate: v.placa || v.idVeiculo || '',
              
              // Regra estrita: Envolver em Number()
              latitude: Number(rawLat),
              longitude: Number(rawLng),
              odometer: Number(rawOdometer),
              
              lastLocation: {
                  lat: Number(rawLat),
                  lng: Number(rawLng),
                  address: v.rua || '',
                  city: v.cidade || '',
                  state: v.uf || '',
                  updatedAt: parseSascarDate(v.dataPosicao || v.dataHora).toISOString()
              }
          };
      });

      logToFile(`[Sascar] Sincronização finalizada: ${processedVehicles.length} veículos únicos encontrados.`);

      res.json({
        success: true,
        message: `Sincronização concluída. ${processedVehicles.length} veículos processados.`,
        data: processedVehicles
      });
    } catch (error: any) {
      logToFile(`Error in /api/sascar/vehicles: ${error.message}`);
      res.status(500).json({ 
          success: false, 
          error: "Falha ao comunicar com a Sascar",
          details: error.message,
          debug: { userUsed: user }
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
