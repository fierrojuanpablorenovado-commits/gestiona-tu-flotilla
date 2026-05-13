'use client';

import { clsx } from 'clsx';
import { useState, useEffect } from 'react';

export interface KanbanCard {
  id: string;
  content: React.ReactNode;
}

export interface KanbanColumn {
  id: string;
  title: string;
  count: number;
  color: string;
  cards: KanbanCard[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onCardClick?: (cardId: string, columnId: string) => void;
}

export function KanbanBoard({ columns, onCardClick }: KanbanBoardProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [cols, setCols] = useState(columns);

  useEffect(() => { setCols(columns); }, [columns]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {cols.map((col) => (
        <div
          key={col.id}
          className="flex-shrink-0 w-72"
        >
          {/* Column Header */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className={clsx('h-2.5 w-2.5 rounded-full', col.color)} />
            <h3 className="text-sm font-semibold text-slate-700">{col.title}</h3>
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-xs font-medium text-slate-600">
              {col.count}
            </span>
          </div>

          {/* Column Body */}
          <div
            className={clsx(
              'kanban-column space-y-2 rounded-lg bg-slate-50 p-2 border border-slate-200/60 transition-all',
              dragOver === col.id ? 'ring-2 ring-blue-400 bg-blue-50/50' : ''
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              const cardId = e.dataTransfer.getData('cardId');
              const fromCol = e.dataTransfer.getData('fromCol');
              if (fromCol === col.id) { setDragOver(null); return; }
              setCols(prev => {
                const next = prev.map(c => ({ ...c, cards: [...c.cards] }));
                const src = next.find(c => c.id === fromCol);
                const dst = next.find(c => c.id === col.id);
                if (!src || !dst) return prev;
                const idx = src.cards.findIndex(c => c.id === cardId);
                if (idx === -1) return prev;
                const [card] = src.cards.splice(idx, 1);
                dst.cards.push(card);
                return next;
              });
              setDragOver(null);
              setDragging(null);
            }}
          >
            {col.cards.map((card) => (
              <div
                key={card.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('cardId', card.id);
                  e.dataTransfer.setData('fromCol', col.id);
                  setDragging(card.id);
                }}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                onClick={onCardClick ? () => onCardClick(card.id, col.id) : undefined}
                className={clsx(
                  'rounded-lg bg-white border border-slate-200 p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing',
                  'hover:shadow-md hover:border-slate-300',
                  onCardClick && 'cursor-pointer',
                  dragging === card.id ? 'opacity-40 scale-95' : ''
                )}
              >
                {card.content}
              </div>
            ))}

            {col.cards.length === 0 && (
              <div className="flex items-center justify-center py-8 text-xs text-slate-400">
                Sin elementos
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
