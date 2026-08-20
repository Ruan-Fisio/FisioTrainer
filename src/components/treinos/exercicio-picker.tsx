"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export type ExercicioOption = {
  id: string;
  name: string;
  links: { id: string; url: string }[];
};

export function ExercicioPicker({
  options,
  value,
  onChange,
}: {
  options: ExercicioOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selecionado = options.find((option) => option.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selecionado ? selecionado.name : "Selecionar exercício"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar exercício..." />
          <CommandList>
            <CommandEmpty>Nenhum exercício encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  data-checked={value === option.id}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
