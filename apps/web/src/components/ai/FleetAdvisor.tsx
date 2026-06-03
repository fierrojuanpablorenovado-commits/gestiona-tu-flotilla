'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, ChevronDown, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { label: '/brief', description: 'Resumen del día' },
  { label: '/alertas', description: 'Alertas críticas' },
  { label: '/reporte', description: 'Reporte semanal' },
  { label: '/mantenimiento', description: 'Servicios pendientes' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function sendChat(
  message: string,
  history: Message[],
  token: string,
): Promise<{ response: string; suggestions: string[] }> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error('Error al contactar al Asesor IA');
  return res.json();
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('fleet_token') ?? sessionStorage.getItem('fleet_token') ?? '';
}

export function FleetAdvisor() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(QUICK_ACTIONS.map((a) => a.label));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content:
            '¡Hola! Soy tu Asesor de Flota IA. Tengo acceso en tiempo real al estado de tu flotilla. ¿En qué te ayudo hoy?\n\nPuedes preguntarme sobre alertas, generar reportes o escribir un comando rápido como `/brief` o `/alertas`.',
        },
      ]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setSuggestions([]);
    const updatedHistory = [...messages, { role: 'user' as const, content: msg }];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const token = getToken();
      const { response, suggestions: newSuggestions } = await sendChat(
        msg,
        messages,
        token,
      );
      setMessages([...updatedHistory, { role: 'assistant', content: response }]);
      setSuggestions(newSuggestions);
    } catch {
      setMessages([
        ...updatedHistory,
        {
          role: 'assistant',
          content: 'Hubo un error al procesar tu consulta. Verifica la conexión e intenta de nuevo.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-200 font-medium text-sm ${
          open
            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
      >
        {open ? (
          <>
            <ChevronDown className="w-4 h-4" />
            Cerrar
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Asesor IA
          </>
        )}
      </button>

      {/* Panel de chat */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex flex-col w-[400px] max-w-[calc(100vw-2rem)] h-[560px] rounded-2xl shadow-2xl bg-slate-900 border border-slate-700/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Asesor de Flota IA</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Datos en tiempo real
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Sugerencias */}
          {suggestions.length > 0 && !loading && (
            <div className="px-3 py-2 flex gap-2 flex-wrap border-t border-slate-700/40">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700/60 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-700/60 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pregunta sobre tu flota..."
              rows={1}
              className="flex-1 resize-none bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 max-h-24 overflow-y-auto"
              style={{ minHeight: '38px' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
