import { listAllCategorias } from "@/actions/categorias";
import { SearchInput } from "@/components/filters/search-input";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";

export async function ExercicioFilters({
  search,
  categoriaIds,
}: {
  search: string;
  categoriaIds: string[];
}) {
  const categorias = await listAllCategorias();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput defaultValue={search} placeholder="Buscar por nome..." />
      <MultiSelectFilter
        paramName="categorias"
        placeholder="Categorias"
        defaultValue={categoriaIds}
        options={categorias.map((c) => ({ id: c.id, label: c.name }))}
      />
    </div>
  );
}
