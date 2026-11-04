"use client";

import { useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const INSTRUCOES = {
  draggable:
    "Pressione espaço ou Enter para pegar o item, use as setas para movê-lo, espaço ou Enter para soltar e Esc para cancelar.",
};

// O ponteiro decide o destino: os itens podem ser bem altos (seção expandida), e
// comparar centros faria o item trocar de lugar longe de onde a pessoa está
// apontando. Teclado e ponteiro fora da lista caem no item mais próximo.
const detectarDestino: CollisionDetection = (args) => {
  const sobPonteiro = pointerWithin(args);
  return sobPonteiro.length > 0 ? sobPonteiro : closestCenter(args);
};

/**
 * Lista reordenável por arrastar e soltar (mouse, toque e teclado). Os itens não
 * se deslocam durante o arraste, porque podem ser altos demais para isso ser
 * legível: uma etiqueta acompanha o ponteiro e uma linha marca onde o item vai
 * cair. Pode ser aninhada (colunas dentro de uma seção reordenável).
 */
export function ListaReordenavel({
  ids,
  onMover,
  rotuloDe,
  children,
}: {
  ids: string[];
  onMover: (origem: number, destino: number) => void;
  /** Nome do item na etiqueta de arraste e nos anúncios de leitor de tela. */
  rotuloDe: (id: string) => string;
  children: ReactNode;
}) {
  const idLista = useId();
  const [ativo, setAtivo] = useState<string | null>(null);
  const sensores = useSensors(
    // Sem a distância mínima, um simples clique na alça já iniciaria um arraste.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nome = (id: string | number) => rotuloDe(String(id));
  const posicao = (id: string | number) => ids.indexOf(String(id)) + 1;
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `${nome(active.id)} selecionado.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nome(active.id)} sobre a posição ${posicao(over.id)} de ${ids.length}.`
        : `${nome(active.id)} fora da lista.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nome(active.id)} movido para a posição ${posicao(over.id)} de ${ids.length}.`
        : `${nome(active.id)} solto fora da lista.`,
    onDragCancel: ({ active }) => `Movimento de ${nome(active.id)} cancelado.`,
  };

  function aoSoltar({ active, over }: DragEndEvent) {
    setAtivo(null);
    if (!over || active.id === over.id) return;
    const origem = ids.indexOf(String(active.id));
    const destino = ids.indexOf(String(over.id));
    if (origem >= 0 && destino >= 0) onMover(origem, destino);
  }

  return (
    <DndContext
      id={idLista}
      sensors={sensores}
      collisionDetection={detectarDestino}
      accessibility={{ announcements: anuncios, screenReaderInstructions: INSTRUCOES }}
      onDragStart={({ active }) => setAtivo(String(active.id))}
      onDragEnd={aoSoltar}
      onDragCancel={() => setAtivo(null)}
    >
      <SortableContext id={idLista} items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {/* Portal: a posição fixa da etiqueta não pode depender dos cards em volta. */}
      {ativo !== null &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            <div className="flex w-fit max-w-xs cursor-grabbing items-center gap-2 rounded-lg border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-lg">
              <GripVertical className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{rotuloDe(ativo)}</span>
            </div>
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

/** Item da lista; recebe a alça de arraste para posicionar onde fizer sentido. */
export function ItemReordenavel({
  id,
  rotuloAlca,
  children,
}: {
  id: string;
  rotuloAlca: string;
  children: (alca: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
    isOver,
    activeIndex,
    index,
  } = useSortable({ id, transition: null });

  const alca = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={rotuloAlca}
      title={rotuloAlca}
      className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} className={cn("relative", isDragging && "opacity-50")}>
      {isOver && !isDragging && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-primary",
            // Mesma regra de `moverItem`: subindo o item entra antes do destino, descendo, depois.
            activeIndex > index ? "-top-1" : "-bottom-1",
          )}
        />
      )}
      {children(alca)}
    </div>
  );
}
