"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import type { MovimentoGrauEntry } from "@/lib/goniometria";

export type MovimentoOption = {
  id: string;
  nome: string;
  grauIdeal: string;
};

export type { MovimentoGrauEntry };

export function GoniometriaField({
  options,
  value,
  onChange,
}: {
  options: MovimentoOption[];
  value: MovimentoGrauEntry[];
  onChange: (entries: MovimentoGrauEntry[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selecionados = new Set(value.map((entry) => entry.nome));

  function addMovimento(nome: string) {
    if (selecionados.has(nome)) return;
    onChange([...value, { nome, grauAlcancado: "" }]);
    setOpen(false);
  }

  function removeMovimento(nome: string) {
    onChange(value.filter((entry) => entry.nome !== nome));
  }

  function updateGrau(nome: string, grauAlcancado: string) {
    onChange(
      value.map((entry) =>
        entry.nome === nome ? { ...entry, grauAlcancado } : entry,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          >
            Adicionar movimento
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar movimento..." />
            <CommandList>
              <CommandEmpty>Nenhum movimento encontrado.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.nome}
                    data-checked={selecionados.has(option.nome)}
                    onSelect={() => addMovimento(option.nome)}
                  >
                    <span className="flex-1 truncate">{option.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.grauIdeal}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          {value.map((entry) => {
            const grauIdeal = options.find(
              (option) => option.nome === entry.nome,
            )?.grauIdeal;
            return (
              <div
                key={entry.nome}
                className="flex items-center gap-2 rounded-lg border border-input p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.nome}
                  </p>
                  {grauIdeal && (
                    <p className="text-xs text-muted-foreground">
                      Grau ideal: {grauIdeal}
                    </p>
                  )}
                </div>
                <Input
                  className="w-32 shrink-0"
                  placeholder="Grau alcançado"
                  value={entry.grauAlcancado}
                  onChange={(e) => updateGrau(entry.nome, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeMovimento(entry.nome)}
                >
                  <X className="size-4 text-destructive" />
                  <span className="sr-only">Remover {entry.nome}</span>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
