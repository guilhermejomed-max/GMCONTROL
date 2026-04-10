import { TrackerSettings } from '../types';

export const sascarService = {
  getVehicles: async (plates?: string[], trackerSettings?: TrackerSettings, retries = 2) => {
    const fetchWithTimeout = async (url: string, options: any, timeout = 120000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          const timeoutError = new Error('Timeout da requisição (120s)');
          timeoutError.name = 'TimeoutError';
          throw timeoutError;
        }
        throw error;
      }
    };

    const maxRetries = 2;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetchWithTimeout(`/proxy-sascar/vehicles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ plates, trackerSettings })
        }, 180000); // Aumentado para 180s (3 min)
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Resposta inválida do servidor (não é JSON): ${text.substring(0, 100)}...`);
        }

        const data = await response.json();
        
        if (!response.ok) {
          if (data.mockData) {
            console.warn("Using mock data due to API error:", data.details);
            return data;
          }
          throw new Error(data.error || 'Falha ao buscar dados da Sascar');
        }
        return data;
      } catch (error: any) {
        const isLastRetry = i === maxRetries;
        const isTimeout = error.name === 'TimeoutError' || error.message?.includes('Timeout');
        const isNetworkError = error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('NetworkError');

        if (isLastRetry) {
          console.error('Erro na integração Sascar (Final):', error);
          if (isTimeout) throw new Error('A requisição à Sascar demorou muito tempo. A sincronização continua em segundo plano, tente novamente em alguns instantes.');
          if (isNetworkError) throw new Error('Erro de conexão com o servidor. O servidor pode estar processando uma fila longa da Sascar. Aguarde um momento e tente novamente.');
          throw error;
        }
        
        const delay = 2000 * (i + 1);
        console.warn(`Tentativa ${i + 1}/${maxRetries + 1} falhou (${error.message}), tentando novamente em ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};
