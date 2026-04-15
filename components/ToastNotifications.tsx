import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastNotificationsProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastNotifications: React.FC<ToastNotificationsProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className="pointer-events-auto bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-4 flex items-start gap-3 w-80 md:w-96 animate-in slide-in-from-right fade-in duration-300 relative overflow-hidden"
        >
          {/* Status Bar */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
             toast.type === 'success' ? 'bg-green-500' : 
             toast.type === 'error' ? 'bg-red-500' : 
             toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
          }`}></div>

          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-slate-800">{toast.title}</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};