"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { buildListParam } from "@/lib/search-params";

export type MultiSelectOption = {
  id: string;
  label: string;
};

export function MultiSelectFilter({
  paramName,
  options,
  placeholder = "Filtrar...",
  defaultValue,
}: {
  paramName: string;
  options: MultiSelectOption[];
  placeholder?: string;
  defaultValue: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const selected = defaultValue;

  function updateSelection(ids: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    const value = buildListParam(ids);
    if (value) {
      params.set(paramName, value);
    } else {
      params.delete(paramName);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];
    updateSelection(next);
  }

  const selectedOptions = options.filter((option) =>
    selected.includes(option.id),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between">
            {placeholder}
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar..." />
            <CommandList>
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    data-checked={selected.includes(option.id)}
                    onSelect={() => toggle(option.id)}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.map((option) => (
        <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
          {option.label}
          <button
            type="button"
            onClick={() => toggle(option.id)}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="size-3" />
            <span className="sr-only">Remover {option.label}</span>
          </button>
        </Badge>
      ))}
    </div>
  );
}
