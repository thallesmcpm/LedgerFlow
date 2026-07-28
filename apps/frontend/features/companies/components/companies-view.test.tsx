import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CompaniesView } from './companies-view';

/**
 * Os números da carteira só existiam no dashboard, e a tela de empresas não
 * tinha como recortar a lista. Os cartões passam a ser o atalho: clicar em
 * «Situação irregular» mostra apenas as irregulares.
 */
const useCompanies = vi.fn(() => ({
  data: { data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
  isLoading: false,
  isError: false,
}));

vi.mock('@/features/companies/hooks/use-companies', () => ({
  useCompanies: (params: unknown) => useCompanies(params as never),
}));

vi.mock('@/features/portfolio/hooks/use-portfolio', () => ({
  usePortfolio: () => ({
    data: {
      totals: { companies: 6, irregulares: 2 },
      bySituacao: [
        { label: 'ATIVA', count: 4 },
        { label: 'BAIXADA', count: 2 },
      ],
      byState: [
        { label: 'SP', count: 4 },
        { label: 'RJ', count: 2 },
      ],
      byPorte: [],
      byCnae: [],
      byAge: [],
    },
    isLoading: false,
  }),
}));

vi.mock('@/features/auth/hooks/use-tenant', () => ({
  useTenant: () => ({ tenantId: 'tnt_dev' }),
}));

// A tabela navega para a ficha da empresa; fora do Next não há router montado.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/companies',
  useSearchParams: () => new URLSearchParams(),
}));

/** O parâmetro da última chamada a `useCompanies`, que é o que filtra a tabela. */
function ultimoFiltro(): Record<string, unknown> {
  const calls = useCompanies.mock.calls;
  return calls[calls.length - 1][0] as unknown as Record<string, unknown>;
}

function render(): ReturnType<typeof rtlRender> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>
      <CompaniesView />
    </QueryClientProvider>,
  );
}

describe('CompaniesView — cartões que filtram', () => {
  beforeEach(() => {
    useCompanies.mockClear();
  });

  it('mostra os números da carteira', () => {
    render();

    expect(screen.getByText('Empresas na carteira')).toBeInTheDocument();
    expect(screen.getByText('Situação ativa')).toBeInTheDocument();
    expect(screen.getByText('Situação irregular')).toBeInTheDocument();
    expect(screen.getByText('Estados atendidos')).toBeInTheDocument();
  });

  it('começa sem nenhum recorte aplicado', () => {
    render();

    expect(ultimoFiltro().situacao).toBeUndefined();
    expect(ultimoFiltro().irregular).toBeUndefined();
  });

  it('filtra por situação ativa ao clicar no cartão', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', { name: /situação ativa/i }));

    expect(ultimoFiltro().situacao).toBe('ATIVA');
  });

  it('filtra por irregular como negação, não por um valor exato', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', { name: /situação irregular/i }));

    expect(ultimoFiltro().irregular).toBe(true);
    expect(ultimoFiltro().situacao).toBeUndefined();
  });

  it('volta a mostrar todas ao clicar em «Empresas na carteira»', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', { name: /situação ativa/i }));
    await user.click(screen.getByRole('button', { name: /empresas na carteira/i }));

    expect(ultimoFiltro().situacao).toBeUndefined();
    expect(ultimoFiltro().irregular).toBeUndefined();
  });

  it('clicar de novo no cartão ativo desfaz o recorte', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', { name: /situação ativa/i }));
    await user.click(screen.getByRole('button', { name: /situação ativa/i }));

    expect(ultimoFiltro().situacao).toBeUndefined();
  });

  it('não torna «Estados atendidos» clicável: é contagem, não característica', () => {
    render();

    expect(
      screen.queryByRole('button', { name: /estados atendidos/i }),
    ).not.toBeInTheDocument();
  });
});
