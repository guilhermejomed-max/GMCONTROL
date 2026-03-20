import { TrackerSettings } from '../types';

export const sascarService = {
  getVehicles: async (plates?: string[], trackerSettings?: TrackerSettings, retries = 2) => {
    const fetchWithTimeout = async (url: string, options: any, timeout = 180000) => {
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
          const timeoutError = new Error('Timeout');
          timeoutError.name = 'TimeoutError';
          throw timeoutError;
        }
        throw error;
      }
    };

    for (let i = 0; i <= 1; i++) { // Reduzido para 1 retry (total 2 tentativas)
      try {
        const response = await fetchWithTimeout(`/api/sascar/vehicles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ plates, trackerSettings })
        });
        
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
        const isLastRetry = i === 1;
        const isTimeout = error.name === 'TimeoutError' || error.message === 'Timeout';
        const isNetworkError = error.message === 'Failed to fetch' || error.name === 'TypeError';

        if (isLastRetry) {
          console.error('Erro na integração Sascar (Final):', error);
          if (isTimeout) throw new Error('A requisição à Sascar demorou muito tempo (Timeout excedido).');
          if (isNetworkError) throw new Error('Erro de conexão com o servidor. Verifique se o servidor está online.');
          throw error;
        }
        
        console.warn(`Tentativa ${i + 1} falhou (${error.message}), tentando novamente em 3s...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
};
