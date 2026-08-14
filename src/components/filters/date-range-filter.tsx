"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export function DateRangeFilter({
  fromParamName = "de",
  toParamName = "ate",
  defaultFrom,
  defaultTo,
}: {
  fromParamName?: string;
  toParamName?: string;
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <InputGroup className="w-[150px] shrink-0">
        <InputGroupAddon>
          <Calendar />
        </InputGroupAddon>
        <InputGroupInput
          id={fromParamName}
          type="date"
          aria-label="De"
          defaultValue={defaultFrom}
          onChange={(event) => updateParam(fromParamName, event.target.value)}
        />
      </InputGroup>
      <span className="text-xs text-muted-foreground">até</span>
      <InputGroup className="w-[150px] shrink-0">
        <InputGroupAddon>
          <Calendar />
        </InputGroupAddon>
        <InputGroupInput
          id={toParamName}
          type="date"
          aria-label="Até"
          defaultValue={defaultTo}
          onChange={(event) => updateParam(toParamName, event.target.value)}
        />
      </InputGroup>
    </div>
  );
}
