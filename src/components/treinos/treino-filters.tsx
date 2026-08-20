import { SearchInput } from "@/components/filters/search-input";

export function TreinoFilters({ search }: { search: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput defaultValue={search} placeholder="Buscar por nome..." />
    </div>
  );
}
