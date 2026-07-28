'use client';

import { useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Landmark } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { SearchBar } from '@/components/ui/search-bar';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/cn';
import { CompaniesTable } from '@/features/companies/components/companies-table';
import { CnpjLookupForm } from '@/features/companies/components/cnpj-lookup-form';
import { useCompanies } from '@/features/companies/hooks/use-companies';
import { usePortfolio } from '@/features/portfolio/hooks/use-portfolio';
import { useDebounce } from '@/hooks/use-debounce';
import { useTenant } from '@/features/auth/hooks/use-tenant';
import { queryKeys } from '@/constants/query-keys';

const ACTIVE_LABEL = 'ATIVA';

/** Recorte aplicado à lista. `todas` é a ausência de recorte. */
type Recorte = 'todas' | 'ativa' | 'irregular';

const RECORTE_PARAMS: Record<Recorte, { situacao?: string; irregular?: boolean }> = {
  todas: {},
  ativa: { situacao: ACTIVE_LABEL },
  irregular: { irregular: true },
};

export function CompaniesView(): React.ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [recorte, setRecorte] = useState<Recorte>('todas');
  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data, isLoading, isError } = useCompanies({
    page,
    search: debouncedSearch,
    ...RECORTE_PARAMS[recorte],
  });

  // Os números seguem a busca, para descreverem o que está sendo listado —
  // não a carteira inteira. Sem isso, buscar "padaria" mostraria "6 empresas".
  const portfolio = usePortfolio({ search: debouncedSearch || undefined });

  const totais = portfolio.data;
  const ativas =
    totais?.bySituacao.find((b) => b.label === ACTIVE_LABEL)?.count ?? 0;

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  /** Clicar no cartão já ativo desfaz o recorte — evita o beco sem saída. */
  function aplicarRecorte(alvo: Recorte): void {
    setRecorte((atual) => (atual === alvo ? 'todas' : alvo));
    setPage(1);
  }

  function handleCompanySaved(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all(tenantId) });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" description="Gerencie as empresas da sua carteira." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FiltroCard
          title="Empresas na carteira"
          value={String(totais?.totals.companies ?? 0)}
          icon={Building2}
          isLoading={portfolio.isLoading}
          ativo={recorte === 'todas'}
          onClick={() => aplicarRecorte('todas')}
        />
        <FiltroCard
          title="Situação ativa"
          value={String(ativas)}
          icon={CheckCircle2}
          isLoading={portfolio.isLoading}
          ativo={recorte === 'ativa'}
          onClick={() => aplicarRecorte('ativa')}
        />
        <FiltroCard
          title="Situação irregular"
          value={String(totais?.totals.irregulares ?? 0)}
          icon={AlertTriangle}
          isLoading={portfolio.isLoading}
          ativo={recorte === 'irregular'}
          onClick={() => aplicarRecorte('irregular')}
        />
        {/*
          «Estados atendidos» conta estados distintos, não empresas — não há
          característica única para filtrar. Fica como informação.
        */}
        <StatCard
          title="Estados atendidos"
          value={String(totais?.byState.length ?? 0)}
          icon={Landmark}
          isLoading={portfolio.isLoading}
        />
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Cadastrar empresa por CNPJ</h2>
        <CnpjLookupForm onSaved={handleCompanySaved} />
      </Card>

      <div className="max-w-sm">
        <SearchBar value={search} onValueChange={handleSearchChange} placeholder="Buscar por nome ou CNPJ..." />
      </div>

      {isError ? (
        <EmptyState icon={Building2} title="Erro ao carregar empresas" description="Tente novamente em instantes." />
      ) : (
        <>
          <CompaniesTable data={data?.data ?? []} isLoading={isLoading} />
          {data ? <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} /> : null}
        </>
      )}
    </div>
  );
}

function FiltroCard({
  title,
  value,
  icon,
  isLoading,
  ativo,
  onClick,
}: {
  readonly title: string;
  readonly value: string;
  readonly icon: React.ComponentProps<typeof StatCard>['icon'];
  readonly isLoading: boolean;
  readonly ativo: boolean;
  readonly onClick: () => void;
}): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'rounded-xl text-left transition-shadow hover:shadow-elevation-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ativo ? 'ring-2 ring-primary' : undefined,
      )}
    >
      <StatCard title={title} value={value} icon={icon} isLoading={isLoading} />
    </button>
  );
}
