import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import soap from "soap";
import path from "path";
import fs from "fs";
import https from "https";
import axios from "axios";

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
    
    // NOVO BLOCO: Se a biblioteca SOAP já entregou como objeto Date
    if (dateStr instanceof Date) {
        // Verifica se a data é válida
        if (isNaN(dateStr.getTime())) return new Date();
        
        // SOMA 3 HORAS para compensar a leitura errada em UTC do servidor
        // Usamos o timestamp direto para evitar problemas de fuso horário do servidor
        return new Date(dateStr.getTime() + (3 * 60 * 60 * 1000));
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

    if (!str) return new Date(0);
    const strOrig = String(str);
    
    // Remove milissegundos extras que a Sascar envia (ex: "2026-03-15 00:43:32.0")
    const cleanStr = strOrig.split('.')[0];

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
        } catch (e) {
            logToFile(`[Sascar Date] Erro ao criar data ISO: ${strOrig}`);
        }
    }

    // Tenta parsing padrão se tudo falhar
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
        return d;
    }

    logToFile(`[Sascar Date] Falha total ao parsear data: "${strOrig}"`);
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
            odometroExato: parseFloat(sv.odometroExato || (sv.odometro ? (sv.odometro > 5000000 ? sv.odometro / 1000 : sv.odometro) : 0)),
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
      fetchPromise: null as Promise<void> | null,
      reachedRealTimeOnce: false // Flag para saber se já limpamos o backlog alguma vez
  };

  async function synchronizedSascarCall<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    const currentLock = sascarRequestLock;
    let resolveLock: () => void;
    sascarRequestLock = new Promise((resolve) => {
      resolveLock = resolve;
    });

    try {
      await currentLock;
      // Add a small delay between any two Sascar calls to be safe
      await new Promise(resolve => setTimeout(resolve, 50));
      
      let attempt = 0;
      while (true) {
        try {
          return await fn();
        } catch (error: any) {
          attempt++;
          const isNetworkError = error.code === 'ECONNRESET' || 
                                 error.code === 'ETIMEDOUT' || 
                                 error.message?.includes('socket disconnected') ||
                                 error.message?.includes('socket hang up') ||
                                 error.message?.includes('Client network socket disconnected');
          if (isNetworkError && attempt <= retries) {
            logToFile(`[Sascar] Network error (${error.message}), retrying attempt ${attempt}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // exponential backoff
          } else {
            throw error;
          }
        }
      }
    } finally {
      // @ts-ignore
      if (resolveLock) resolveLock();
    }
  }

  // Concurrency limiter for historical fetches
  const MAX_CONCURRENT_SASCAR_CALLS = 3;
  let activeSascarCalls = 0;
  const sascarQueue: (() => void)[] = [];

  async function concurrentSascarCall<T>(fn: () => Promise<T>): Promise<T> {
    if (activeSascarCalls >= MAX_CONCURRENT_SASCAR_CALLS) {
      await new Promise<void>(resolve => sascarQueue.push(resolve));
    }
    
    activeSascarCalls++;
    try {
      return await fn();
    } finally {
      activeSascarCalls--;
      if (sascarQueue.length > 0) {
        const next = sascarQueue.shift();
        if (next) next();
      }
    }
  }

  async function getSoapClient(wsdl: string, retries = 2) {
    // If it's the default URL or the service endpoint without ?wsdl, use the local file instead
    const targetWsdl = (wsdl === SASCAR_WSDL_URL || wsdl === 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService') 
      ? SASCAR_WSDL_LOCAL 
      : wsdl;
    
    if (!soapClients.has(targetWsdl)) {
      console.log(`[Sascar] Criando cliente SOAP para: ${targetWsdl}`);
      logToFile(`[Sascar] Criando cliente SOAP para: ${targetWsdl}`);
      let attempt = 0;
      while (true) {
        try {
          const client = await soap.createClientAsync(targetWsdl, {
            disableCache: false,
            request: axios.create({
              httpsAgent: new https.Agent({ keepAlive: false, rejectUnauthorized: false }) // TODO: Review security implications of rejectUnauthorized: false
            })
          });
          soapClients.set(targetWsdl, client);
          break;
        } catch (error: any) {
          attempt++;
          const isNetworkError = error.code === 'ECONNRESET' || 
                                 error.code === 'ETIMEDOUT' || 
                                 error.message?.includes('socket disconnected') ||
                                 error.message?.includes('socket hang up') ||
                                 error.message?.includes('Client network socket disconnected');
          
          if (isNetworkError && attempt <= retries) {
            console.log(`[Sascar] Network error creating SOAP client (${error.message}), retrying attempt ${attempt}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          } else {
            console.error(`[Sascar] Erro ao criar cliente SOAP (${targetWsdl}):`, error.message);
            throw error;
          }
        }
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
      currentTimeout: number,
      isBackground: boolean = false
  ) {
      logToFile(`[Sascar] INICIANDO DRENAGEM DA FILA FIFO...`);
      
      let total = 0;
      let iterations = 0;
      
      // Data alvo: Hoje (início do dia em BRT)
      const now = new Date();
      const brtFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: "America/Sao_Paulo",
          year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const brtParts = brtFormatter.formatToParts(now);
      const getPart = (type: string) => brtParts.find(p => p.type === type)?.value || '0';
      
      const targetDateIso = `${getPart('year')}-${getPart('month')}-${getPart('day')}T00:00:00-03:00`;
      const targetDate = new Date(targetDateIso);
      
      // Também definimos um alvo de "agora" para tentar chegar o mais perto possível do tempo real
      const nowBrt = new Date(Date.now() - (15 * 60 * 1000)); // 15 minutos atrás
      
      logToFile(`[Sascar Drenagem] Alvo Real-Time (Hoje): ${targetDate.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}`);
      logToFile(`[Sascar Drenagem] Alvo Atual (15min atrás): ${nowBrt.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}`);
      
      let reachedRealTime = false;
      let reachedNow = false;
      let hasMore = true;

      while (hasMore && iterations < maxIterations) {
          if (Date.now() - fetchStartTime > currentTimeout) {
              logToFile(`[Sascar] Timeout iminente (${currentTimeout}ms). Interrompendo limpeza da fila na iteração ${iterations}.`);
              break;
          }
          
          iterations++;
          try {
              // Se for background, damos um pequeno respiro para não monopolizar o lock
              if (isBackground) {
                  await new Promise(resolve => setTimeout(resolve, 100));
              }

              const result = await synchronizedSascarCall(async () => {
                  if (Date.now() - fetchStartTime > currentTimeout) return null;
                  return client.obterPacotePosicoesJSONAsync({
                      usuario: user,
                      senha: pass,
                      quantidade: 5000
                  }, { timeout: 60000 }).then(([res]: any) => res);
              }) as any;
              
              if (!result) {
                  hasMore = false;
                  break;
              }
              
              const frotaEmTexto = result ? (result.return || result.retornar) : null;
              if (frotaEmTexto) {
                  let frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
                  
                  if (frotaArray.length === 0) {
                      hasMore = false;
                      break;
                  }

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
                  
                  // Log de progresso da fila
                  logToFile(`[Sascar Drenagem] Iteração ${iterations}/${maxIterations}: ${frotaArray.length} itens. Lote: ${firstDate.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})} até ${lastDate.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}`);

                  // Verifica se já alcançamos pacotes de hoje
                  if (lastDate >= targetDate) {
                      if (!reachedRealTime) {
                          logToFile(`[Sascar Drenagem] Alcançamos o tempo real hoje: ${lastDate.toISOString()}!`);
                      }
                      reachedRealTime = true;
                      sascarCache.reachedRealTimeOnce = true;
                  }
                  
                  if (lastDate >= nowBrt) {
                      if (!reachedNow) {
                          logToFile(`[Sascar Drenagem] Alcançamos o tempo atual (últimos 15min): ${lastDate.toISOString()}!`);
                      }
                      reachedNow = true;
                  }

                  // Se já chegamos no "agora" e não somos um fetch de background, podemos parar para economizar tempo
                  if (reachedNow && !isBackground && iterations >= 20) {
                      logToFile(`[Sascar Drenagem] Alcançamos o tempo atual e já fizemos ${iterations} iterações. Parando por aqui.`);
                      hasMore = false;
                  }
                  
                  total += frotaArray.length;
                  
                  // Processa os itens do lote
                  for (const item of frotaArray) {
                      let sv = item;
                      if (typeof item === 'string') {
                          try { sv = JSON.parse(item); if (typeof sv === 'string') sv = JSON.parse(sv); } catch (e) { continue; }
                      }
                      
                      const itemDate = parseSascarDate(sv.dataPosicao || sv.dataHora);
                      
                      // Sempre sobrescreve com a posição mais recente da fila (se for mais nova que a que já temos)
                      const idVeiculo = String(sv.idVeiculo || sv.id || "");
                      if (idVeiculo) {
                          if (!sv.placa && idToPlateMap.has(idVeiculo)) {
                              sv.placa = idToPlateMap.get(idVeiculo);
                          }
                          
                          const existing = latestPositions.get(idVeiculo);
                          const existingDate = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
                          
                          if (!existing || itemDate.getTime() > existingDate) {
                              latestPositions.set(idVeiculo, sv);
                          }
                      }
                  }
                  
                  // Se retornou menos que 500, a fila esvaziou
                  if (frotaArray.length < 500) {
                      logToFile(`[Sascar Drenagem] Fila esvaziada.`);
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
          const stats = await drainSascarQueue(user, pass, client, tempPositions, tempMap, 100, start, 10 * 60 * 1000, false);
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
      const wsdl = trackerSettings?.apiUrl || SASCAR_WSDL;
      
      logToFile(`[Server] Attempting to get SOAP client for user: ${user} using WSDL: ${wsdl}`);
      const client = await getSoapClient(wsdl);
      logToFile("[Server] SOAP client obtained successfully");
      
      let allVehiclesRaw: any[] = [];
      let latestPositions = new Map<string, any>();
      let idToPlateMap = new Map<string, string>();

      // Aumentar o timeout da requisição para evitar "Failed to fetch" no frontend
      const startTime = Date.now();
      const MAX_REQUEST_TIME = 55000; // Reduzido para 55s para garantir resposta antes do proxy timeout
      const CACHE_TTL = 2 * 60 * 1000; // 2 minutos
      const MAP_CACHE_TTL = 60 * 60 * 1000; // 1 hora para o mapa de placas

      const formatDateBRT = (d: Date) => {
          const options = {
              timeZone: "America/Sao_Paulo",
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: false
          } as const;
          const formatter = new Intl.DateTimeFormat('en-GB', options);
          const parts = formatter.formatToParts(d);
          const getPart = (type: string) => parts.find(p => p.type === type)?.value;
          return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
      };

      const performFetch = async (isBackground: boolean = false) => {
          const fetchStartTime = Date.now();
          const currentTimeout = isBackground ? 600000 : MAX_REQUEST_TIME; // 10 minutos para background, 150s para foreground

          // 0. Mapeamento de Placas (Cacheado por 1 hora)
          try {
              if (sascarCache.idToPlateMap.size === 0 || (Date.now() - sascarCache.lastMapFetchTime > MAP_CACHE_TTL)) {
                  logToFile(`[Sascar] Buscando lista de veículos para mapeamento de placas...`);
                  const result = await synchronizedSascarCall(async () => {
                      if (Date.now() - fetchStartTime > currentTimeout) return null;
                      return client.obterVeiculosJsonAsync({
                          usuario: user,
                          senha: pass,
                          quantidade: 5000
                      }, { timeout: 45000 }).then(([res]: any) => res);
                  }) as any;
                  
                  if (!result) return;
                  
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

      const MAX_QUEUE_ITERATIONS = isBackground ? 1500 : (sascarCache.reachedRealTimeOnce ? 50 : 80); 
          
          if (!isBackground) {
              logToFile(`[Sascar] Foreground request: Limpeza de fila (${MAX_QUEUE_ITERATIONS} iterações) para tentar alcançar o tempo real.`);
          } else {
              logToFile(`[Sascar] Background request: Limpeza de fila profunda (${MAX_QUEUE_ITERATIONS} iterações) para limpar backlog.`);
          }
          
          await drainSascarQueue(
              user, 
              pass, 
              client, 
              latestPositions, 
              idToPlateMap, 
              MAX_QUEUE_ITERATIONS, 
              fetchStartTime, 
              currentTimeout,
              isBackground
          );
          
          // Update cache
          sascarCache.idToPlateMap = idToPlateMap;
          
          // Merge new positions with existing cache instead of overwriting
          for (const [id, pos] of latestPositions.entries()) {
              const existing = sascarCache.latestPositions.get(id);
              const newDate = parseSascarDate(pos.dataPosicao || pos.dataHora).getTime();
              const oldDate = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
              if (!existing || newDate > oldDate) {
                  sascarCache.latestPositions.set(id, pos);
              }
          }
          
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
              
              // Se ainda não limpamos o backlog (FIFO) pelo menos uma vez hoje, 
              // forçamos a busca por histórico para garantir dados de hoje.
              if (!sascarCache.reachedRealTimeOnce) {
                  return true;
              }
              
              // Se a posição for mais antiga que 30 minutos, tenta buscar o histórico para garantir tempo real
              const posDate = parseSascarDate(pos.dataPosicao || pos.dataHora).getTime();
              const thirtyMinsAgo = Date.now() - (30 * 60 * 1000);
              if (posDate < thirtyMinsAgo) return true;
              
              return false;
          });
          
          if (missingPlates.length > 0) {
              const fetchHistoryForPlates = async (platesToFetch: string[], isBackground: boolean) => {
                  logToFile(`[Sascar] Buscando histórico para ${platesToFetch.length} veículos (Background: ${isBackground})...`);
                  
                  const now = new Date();
                  // Busca desde o início de hoje (BRT) para garantir dados atuais
                  const brtFormatter = new Intl.DateTimeFormat('en-GB', {
                      timeZone: "America/Sao_Paulo",
                      year: 'numeric', month: '2-digit', day: '2-digit'
                  });
                  const brtParts = brtFormatter.formatToParts(now);
                  const brtYear = brtParts.find(p => p.type === 'year')?.value;
                  const brtMonth = brtParts.find(p => p.type === 'month')?.value;
                  const brtDay = brtParts.find(p => p.type === 'day')?.value;
                  
                  const dataInicio = `${brtYear}-${brtMonth}-${brtDay} 00:00:00`;
                  const dataFinal = formatDateBRT(now);

                  // Processa em lotes paralelos maiores para velocidade
                  const BATCH_SIZE = 10;
                  for (let i = 0; i < platesToFetch.length; i += BATCH_SIZE) {
                      // No foreground, paramos mais cedo para garantir que o histórico tenha tempo de rodar
                      if (!isBackground && i > 0 && Date.now() - startTime >= MAX_REQUEST_TIME - 10000) {
                          logToFile(`[Sascar] Tempo esgotado para histórico no foreground. Interrompendo no lote ${i}/${platesToFetch.length}`);
                          break;
                      }
                      
                      const batch = platesToFetch.slice(i, i + BATCH_SIZE);
                      await Promise.all(batch.map(async (idStr) => {
                          const cleanP = idStr.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                          const resolvedId = plateToIdMap.get(cleanP) || idStr;
                          const idVeiculo = parseInt(resolvedId, 10);
                          if (isNaN(idVeiculo)) return;

                          try {
                              const result = await synchronizedSascarCall(async () => {
                                  if (!isBackground && Date.now() - startTime >= MAX_REQUEST_TIME) return null;
                                  return client.obterPacotePosicaoHistoricoAsync({
                                      usuario: user,
                                      senha: pass,
                                      idVeiculo: idVeiculo,
                                      dataInicio: dataInicio,
                                      dataFinal: dataFinal
                                  }, { timeout: 60000 }).then(([res]: any) => res);
                              }) as any;

                              if (!result) return;

                              const frotaEmTexto = result ? (result.return || result.retornar) : null;
                              if (frotaEmTexto) {
                                  const frotaArray = Array.isArray(frotaEmTexto) ? frotaEmTexto : [frotaEmTexto];
                                  if (frotaArray.length > 0) {
                                      // Pega a posição mais recente do histórico
                                      let latest = null;
                                      let latestTime = 0;
                                      
                                      for (const p of frotaArray) {
                                          let parsedP = p;
                                          if (typeof p === 'string') {
                                              try { parsedP = JSON.parse(p); } catch(e) { continue; }
                                          }
                                          const pTime = parseSascarDate(parsedP.dataPosicao || parsedP.dataHora).getTime();
                                          if (pTime > latestTime) {
                                              latestTime = pTime;
                                              latest = parsedP;
                                          }
                                      }

                                      if (latest) {
                                          if (!latest.placa && idToPlateMap.has(String(idVeiculo))) {
                                              latest.placa = idToPlateMap.get(String(idVeiculo));
                                          }
                                          
                                          // Só atualiza se for mais novo que o que já temos
                                          const existing = latestPositions.get(String(idVeiculo));
                                          const existingTime = existing ? parseSascarDate(existing.dataPosicao || existing.dataHora).getTime() : 0;
                                          
                                          if (latestTime > existingTime) {
                                              if (!isBackground) {
                                                  latestPositions.set(String(idVeiculo), latest);
                                              }
                                              sascarCache.latestPositions.set(String(idVeiculo), latest);
                                          }
                                      }
                                  }
                              }
                          } catch (error: any) {
                              logToFile(`[Sascar] Erro histórico ${idVeiculo}: ${error.message}`);
                          }
                      }));
                  }
              };

              // Tenta buscar o histórico para no máximo 20 ausentes por vez no foreground
              const foregroundPlates = missingPlates.slice(0, 20);
              const backgroundPlates = missingPlates.slice(20);

              // Race foreground fetch against the remaining time
              const timeRemaining = MAX_REQUEST_TIME - (Date.now() - startTime);
              if (timeRemaining > 0) {
                  await Promise.race([
                      fetchHistoryForPlates(foregroundPlates, false),
                      new Promise(resolve => setTimeout(() => {
                          logToFile(`[Sascar] Timeout iminente (${timeRemaining}ms). Interrompendo espera do histórico no foreground.`);
                          resolve(null);
                      }, timeRemaining))
                  ]);
              } else {
                  logToFile(`[Sascar] Tempo esgotado antes de iniciar busca de histórico no foreground.`);
              }

              // Inicia fetch em background para o restante das placas
              if (backgroundPlates.length > 0) {
                  fetchHistoryForPlates(backgroundPlates, true).catch(err => {
                      logToFile(`[Sascar] Erro no fetch de histórico em background: ${err.message}`);
                  });
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
