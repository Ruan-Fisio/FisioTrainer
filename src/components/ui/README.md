# UI Primitives

## Overview
Provides the shared design-system UI primitives built on Radix UI, `cmdk`, Recharts, `sonner`, `@dnd-kit`, `class-variance-authority`, and `cn` (`@/lib/utils`), plus application-level form and reordering primitives (`FormActions`, `NativeSelect`, `ListaReordenavel`). All components expose `data-slot` attributes for Tailwind styling hooks.

## Interface
- `[avatar.tsx:Avatar]`, `[avatar.tsx:AvatarImage]`, `[avatar.tsx:AvatarFallback]`, `[avatar.tsx:AvatarBadge]`, `[avatar.tsx:AvatarGroup]`, `[avatar.tsx:AvatarGroupCount]`: Client avatar primitives (`size?: "default" | "sm" | "lg"`).
- `[badge.tsx:badgeVariants]` and `[badge.tsx:Badge]`: Variant config (`default`, `secondary`, `destructive`, `outline`, `ghost`, `link`) and `asChild`-capable badge component.
- `[button.tsx:buttonVariants]` and `[button.tsx:Button]`: Variant config (`variant`, `size`) and `asChild`-capable button component.
- `[card.tsx:Card]`, `[card.tsx:CardHeader]`, `[card.tsx:CardTitle]`, `[card.tsx:CardDescription]`, `[card.tsx:CardAction]`, `[card.tsx:CardContent]`, `[card.tsx:CardFooter]`: Card layout primitives (`size?: "default" | "sm"`).
- `[chart.tsx:ChartConfig]`, `[chart.tsx:ChartContainer]`, `[chart.tsx:ChartStyle]`, `[chart.tsx:ChartTooltip]`, `[chart.tsx:ChartTooltipContent]`, `[chart.tsx:ChartLegend]`, `[chart.tsx:ChartLegendContent]`: Recharts wrappers and theme-aware chart context/style helpers.
- `[checkbox.tsx:Checkbox]`: Client Radix checkbox primitive with check indicator.
- `[collapsible.tsx:Collapsible]`, `[collapsible.tsx:CollapsibleTrigger]`, `[collapsible.tsx:CollapsibleContent]`: Client Radix collapsible wrappers.
- `[command.tsx:Command]`, `[command.tsx:CommandDialog]`, `[command.tsx:CommandInput]`, `[command.tsx:CommandList]`, `[command.tsx:CommandEmpty]`, `[command.tsx:CommandGroup]`, `[command.tsx:CommandSeparator]`, `[command.tsx:CommandItem]`, `[command.tsx:CommandShortcut]`: Client `cmdk` command palette primitives.
- `[dialog.tsx:Dialog]`, `[dialog.tsx:DialogTrigger]`, `[dialog.tsx:DialogPortal]`, `[dialog.tsx:DialogClose]`, `[dialog.tsx:DialogOverlay]`, `[dialog.tsx:DialogContent]`, `[dialog.tsx:DialogHeader]`, `[dialog.tsx:DialogFooter]`, `[dialog.tsx:DialogTitle]`, `[dialog.tsx:DialogDescription]`: Client Radix modal dialog primitives.
- `[dropdown-menu.tsx:DropdownMenu]`, `[dropdown-menu.tsx:DropdownMenuPortal]`, `[dropdown-menu.tsx:DropdownMenuTrigger]`, `[dropdown-menu.tsx:DropdownMenuContent]`, `[dropdown-menu.tsx:DropdownMenuGroup]`, `[dropdown-menu.tsx:DropdownMenuItem]`, `[dropdown-menu.tsx:DropdownMenuCheckboxItem]`, `[dropdown-menu.tsx:DropdownMenuRadioGroup]`, `[dropdown-menu.tsx:DropdownMenuRadioItem]`, `[dropdown-menu.tsx:DropdownMenuLabel]`, `[dropdown-menu.tsx:DropdownMenuSeparator]`, `[dropdown-menu.tsx:DropdownMenuShortcut]`, `[dropdown-menu.tsx:DropdownMenuSub]`, `[dropdown-menu.tsx:DropdownMenuSubTrigger]`, `[dropdown-menu.tsx:DropdownMenuSubContent]`: Client Radix dropdown menu primitives.
- `[form-actions.tsx:FormActions]`: Client responsive submit/cancel bar accepting `{ submitLabel: string; cancelLabel?: string; onCancel: () => void; submitDisabled?: boolean; submitDisabledLabel?: string }`.
- `[input-group.tsx:InputGroup]`, `[input-group.tsx:InputGroupAddon]`, `[input-group.tsx:InputGroupButton]`, `[input-group.tsx:InputGroupText]`, `[input-group.tsx:InputGroupInput]`, `[input-group.tsx:InputGroupTextarea]`: Client grouped input primitives.
- `[input.tsx:Input]`, `[textarea.tsx:Textarea]`, `[native-select.tsx:NativeSelect]`, `[label.tsx:Label]`: Styled form control primitives.
- `[lista-reordenavel.tsx:ListaReordenavel]` and `[lista-reordenavel.tsx:ItemReordenavel]`: Client `@dnd-kit` vertical sortable list (`{ ids: string[]; onMover: (origem: number, destino: number) => void; rotuloDe: (id: string) => string; children: ReactNode }`) and handle-based sortable item (`{ id: string; rotuloAlca: string; children: (alca: ReactNode) => ReactNode }`).
- `[pagination.tsx:Pagination]`, `[pagination.tsx:PaginationContent]`, `[pagination.tsx:PaginationItem]`, `[pagination.tsx:PaginationLink]`, `[pagination.tsx:PaginationPrevious]`, `[pagination.tsx:PaginationNext]`, `[pagination.tsx:PaginationEllipsis]`: Pagination layout and link primitives.
- `[popover.tsx:Popover]`, `[popover.tsx:PopoverTrigger]`, `[popover.tsx:PopoverContent]`, `[popover.tsx:PopoverAnchor]`, `[popover.tsx:PopoverHeader]`, `[popover.tsx:PopoverTitle]`, `[popover.tsx:PopoverDescription]`: Client Radix popover primitives.
- `[radio-group.tsx:RadioGroup]` and `[radio-group.tsx:RadioGroupItem]`: Client Radix radio group primitives.
- `[separator.tsx:Separator]`, `[skeleton.tsx:Skeleton]`, `[sonner.tsx:Toaster]`: Divider, loading skeleton, and theme-integrated Sonner toast container.
- `[sheet.tsx:Sheet]`, `[sheet.tsx:SheetTrigger]`, `[sheet.tsx:SheetClose]`, `[sheet.tsx:SheetContent]`, `[sheet.tsx:SheetHeader]`, `[sheet.tsx:SheetFooter]`, `[sheet.tsx:SheetTitle]`, `[sheet.tsx:SheetDescription]`: Client Radix Dialog-backed slide-over sheet (`side?: "top" | "right" | "bottom" | "left"`).
- `[table.tsx:Table]`, `[table.tsx:TableHeader]`, `[table.tsx:TableBody]`, `[table.tsx:TableFooter]`, `[table.tsx:TableHead]`, `[table.tsx:TableRow]`, `[table.tsx:TableCell]`, `[table.tsx:TableCaption]`: Client responsive table primitives.
- `[tabs.tsx:Tabs]`, `[tabs.tsx:TabsList]`, `[tabs.tsx:TabsTrigger]`, `[tabs.tsx:TabsContent]`, `[tabs.tsx:tabsListVariants]`: Client Radix tabs primitives (`variant?: "default" | "line"`).
- `[tooltip.tsx:TooltipProvider]`, `[tooltip.tsx:Tooltip]`, `[tooltip.tsx:TooltipTrigger]`, `[tooltip.tsx:TooltipContent]`: Client Radix tooltip primitives.

## Invariants
- `[chart.tsx:useChart]`: Throws `Error("useChart must be used within a <ChartContainer />")` when rendered outside `ChartContainer`; `[chart.tsx:ChartConfig]` enforces mutually exclusive `color` vs. `theme` per key; `[chart.tsx:ChartStyle]` returns `null` when no config entry defines `color` or `theme`; `[chart.tsx:ChartTooltipContent]` and `[chart.tsx:ChartLegendContent]` return `null` on empty payload and exclude `item.type === "none"`.
- `[badge.tsx:Badge]` and `[button.tsx:Button]`: Render Radix `Slot.Root` when `asChild` is `true`, requiring a single `Slot.Root`-compatible child element.
- `[form-actions.tsx:FormActions]`: Derives `pending` from `react-dom` `useFormStatus()`; disables cancel (`type="button"`) only on `pending` and submit (`type="submit"`) on `pending || submitDisabled`; resolves desktop submit text in order `pending` -> `"Salvando..."`, `submitDisabled && submitDisabledLabel`, else `submitLabel`.
- `[input-group.tsx:InputGroupAddon]`: Ignores clicks originating inside `<button>` (`closest("button")`); `[input-group.tsx:InputGroupButton]` defaults `type="button"` to prevent accidental form submission.
- `[lista-reordenavel.tsx:ListaReordenavel]`: Uses `PointerSensor` with `{ distance: 4 }` and `KeyboardSensor` with `sortableKeyboardCoordinates`, prioritizes `pointerWithin` before `closestCenter` (`detectarDestino`), uses a unique `useId()` context ID for nested lists, and calls `onMover(origem, destino)` in `aoSoltar` only when `over` exists, `active.id !== over.id`, and both indices are `>= 0`.
- `[lista-reordenavel.tsx:ItemReordenavel]`: Disables drag transform transitions (`useSortable({ id, transition: null })`) and renders the drop indicator only when `isOver && !isDragging`.
- `[pagination.tsx:PaginationLink]`: Sets `variant="outline"` and `aria-current="page"` when `isActive` is `true` (`variant="ghost"` otherwise).
- `[table.tsx:Table]`: Always wraps `<table>` inside `<div data-slot="table-container" className="relative w-full overflow-x-auto">`.
- `[tabs.tsx:Tabs]`: Destructures `orientation = "horizontal"` to set `data-orientation={orientation}` without forwarding `orientation` to `TabsPrimitive.Root`.
- `[sonner.tsx:Toaster]`: Defaults `useTheme()` to `"system"` and maps CSS variables (`--normal-bg`, `--normal-text`, `--normal-border`, `--border-radius`).
- `[popover.tsx:PopoverContent]`, `[sheet.tsx:SheetContent]`, `[dialog.tsx:DialogContent]`, `[dropdown-menu.tsx:DropdownMenuContent]`, and `[tooltip.tsx:TooltipContent]`: Always render inside their respective Radix Portal primitives; `TooltipProvider` defaults `delayDuration={0}`.

## Side Effects
- `[chart.tsx:ChartStyle]`: Injects an inline `<style>` element via `dangerouslySetInnerHTML` defining `--color-<key>` CSS custom properties scoped to `[data-chart=<id>]` and `.dark [data-chart=<id>]`.
- `[dialog.tsx:DialogPortal]`, `[dialog.tsx:DialogContent]`, `[command.tsx:CommandDialog]`, `[dropdown-menu.tsx:DropdownMenuPortal]`, `[dropdown-menu.tsx:DropdownMenuContent]`, `[popover.tsx:PopoverContent]`, `[sheet.tsx:SheetContent]`, and `[tooltip.tsx:TooltipContent]`: Portal content outside the parent DOM subtree via Radix Portal primitives.
- `[form-actions.tsx:FormActions]`: Subscribes to enclosing `<form>` submission state via `useFormStatus()` and invokes `onCancel` on click.
- `[input-group.tsx:InputGroupAddon]`: Imperatively focuses `e.currentTarget.parentElement?.querySelector("input")` on non-button clicks.
- `[lista-reordenavel.tsx:ListaReordenavel]` and `[lista-reordenavel.tsx:ItemReordenavel]`: Portal `<DragOverlay>` into `document.body` via `createPortal` while dragging, register `@dnd-kit` pointer/keyboard listeners and live-region announcements, attach DOM refs, and invoke `onMover`.
- `[sonner.tsx:Toaster]`: Subscribes to theme state via `next-themes` `useTheme()` and mounts the global Sonner toast container.

## Verification
- Run: `npm test`
