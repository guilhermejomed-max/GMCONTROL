import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let details = null;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = "Erro de Permissao no Banco de Dados";
            details = `Operacao: ${parsed.operationType} em ${parsed.path || 'desconhecido'}`;
          }
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{errorMessage}</h1>
            <p className="text-slate-600 mb-6">
              {details || "Tente recarregar a pagina ou entre em contato com o suporte se o problema persistir."}
            </p>
            
            {details && (
              <div className="bg-slate-100 p-3 rounded-lg text-left mb-6 font-mono text-xs text-slate-700 overflow-auto max-h-32">
                {this.state.error?.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              <RefreshCcw className="h-5 w-5" />
              Recarregar Aplicacao
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
