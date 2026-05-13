'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, X, Truck, Users, Wrench, AlertTriangle, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

const MOCK_DATA: SearchResult[] = [
  { id: 'v1', category: 'Vehículos', title: 'ECO-001 — Toyota Yaris 2021', subtitle: 'Carlos Ramírez · Activo', href: '/vehiculos', icon: Truck, color: 'text-blue-500 bg-blue-50' },
  { id: 'v2', category: 'Vehículos', title: 'ECO-012 — Nissan Versa 2023', subtitle: 'José Luis García · Activo', href: '/vehiculos', icon: Truck, color: 'text-blue-500 bg-blue-50' },
  { id: 'v3', category: 'Vehículos', title: 'ECO-015 — KIA Forte 2022', subtitle: 'En mantenimiento', href: '/vehiculos', icon: Truck, color: 'text-blue-500 bg-blue-50' },
  { id: 'v4', category: 'Vehículos', title: 'ECO-034 — Hyundai Grand i10 2023', subtitle: 'Miguel Torres · Activo', href: '/vehiculos', icon: Truck, color: 'text-blue-500 bg-blue-50' },
  { id: 'v5', category: 'Vehículos', title: 'ECO-045 — Chevrolet Aveo 2022', subtitle: 'Fernando Hernández · Activo', href: '/vehiculos', icon: Truck, color: 'text-blue-500 bg-blue-50' },
  { id: 'c1', category: 'Choferes', title: 'Carlos Ramírez', subtitle: 'ECO-001 · Uber/Didi · Rating 4.9', href: '/choferes', icon: Users, color: 'text-green-500 bg-green-50' },
  { id: 'c2', category: 'Choferes', title: 'Miguel Ángel Torres', subtitle: 'ECO-034 · Uber · Rating 4.8', href: '/choferes', icon: Users, color: 'text-green-500 bg-green-50' },
  { id: 'c3', category: 'Choferes', title: 'José Luis García', subtitle: 'ECO-012 · Didi · Rating 4.7', href: '/choferes', icon: Users, color: 'text-green-500 bg-green-50' },
  { id: 'c4', category: 'Choferes', title: 'Roberto Sánchez', subtitle: 'ECO-089 · Uber · Deuda $1,200', href: '/choferes', icon: Users, color: 'text-green-500 bg-green-50' },
  { id: 'c5', category: 'Choferes', title: 'Fernando Hernández', subtitle: 'ECO-045 · InDriver · Rating 4.6', href: '/choferes', icon: Users, color: 'text-green-500 bg-green-50' },
  { id: 'm1', category: 'Mantenimiento', title: 'OT-2026-0089 — Toyota Yaris ECO-001', subtitle: 'Falla frenos · En diagnóstico · Urgente', href: '/mantenimiento', icon: Wrench, color: 'text-orange-500 bg-orange-50' },
  { id: 'm2', category: 'Mantenimiento', title: 'OT-2026-0093 — Chevrolet Onix ECO-091', subtitle: 'Sobrecalentamiento · En reparación', href: '/mantenimiento', icon: Wrench, color: 'text-orange-500 bg-orange-50' },
  { id: 'm3', category: 'Mantenimiento', title: 'OT-2026-0087 — Nissan March ECO-067', subtitle: 'Cambio de clutch · Esperando refacciones', href: '/mantenimiento', icon: Wrench, color: 'text-orange-500 bg-orange-50' },
  { id: 'i1', category: 'Incidencias', title: 'INC-2026-047 — ECO-001 Golpe', subtitle: 'Carlos Ramírez · Abierta · Mar 2026', href: '/incidencias', icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
  { id: 'i2', category: 'Incidencias', title: 'INC-2026-046 — ECO-023 Multa', subtitle: 'Juan Pablo López · En revisión', href: '/incidencias', icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
];

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [open]);

  const results = query.trim().length < 1
    ? MOCK_DATA.slice(0, 6)
    : MOCK_DATA.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase())
      );

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-start justify-center pt-[15vh] px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar vehículos, choferes, OTs, incidencias..."
            className="flex-1 text-base text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-100 rounded text-slate-400">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin resultados para "{query}"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{category}</p>
                </div>
                {items.map(result => {
                  const Icon = result.icon;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${result.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{result.title}</p>
                        <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-4 text-[11px] text-slate-400">
          <span><kbd className="border border-slate-200 bg-white rounded px-1 py-0.5 text-[10px]">↑↓</kbd> navegar</span>
          <span><kbd className="border border-slate-200 bg-white rounded px-1 py-0.5 text-[10px]">↵</kbd> abrir</span>
          <span><kbd className="border border-slate-200 bg-white rounded px-1 py-0.5 text-[10px]">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
