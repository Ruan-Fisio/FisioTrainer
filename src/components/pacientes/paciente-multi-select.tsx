"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export type PacienteOption = {
  id: string;
  nome: string;
};

export function PacienteMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecionar pacientes",
}: {
  options: PacienteOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
    );
  }

  const selectedOptions = options.filter((option) => value.includes(option.id));

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
          >
            {placeholder}
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar paciente..." />
            <CommandList>
              <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    data-checked={value.includes(option.id)}
                    onSelect={() => toggle(option.id)}
                  >
                    {option.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        {selectedOptions.map((option) => (
          <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
            {option.nome}
            <button
              type="button"
              onClick={() => toggle(option.id)}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="size-3" />
              <span className="sr-only">Remover {option.nome}</span>
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
