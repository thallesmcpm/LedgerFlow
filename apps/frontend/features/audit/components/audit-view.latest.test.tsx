import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditView } from './audit-view';

/**
 * As execuções sempre ficaram gravadas no banco, mas a tela só mostrava o
 * resultado do clique: recarregar a página apagava da vista um trabalho que
 * pode ter levado minutos e dezenas de consultas à BrasilAPI.
 */
const ULTIMA = {
  total: 2,
  healthy: 1,
  attention: 0,
  critical: 1,
  runs: [
    {
      id: 'aud_ruim',
      companyId: 'cmp_2',
      companyName: 'Empresa Com Problema',
      score: 10,
      status: 'critical' as const,
      findingsCount: 6,
      createdAt: '2026-07-28T04:00:00.000Z',
    },
    {
      id: 'aud_boa',
      companyId: 'cmp_1',
      companyName: 'Empresa Regular',
      score: 100,
      status: 'healthy' as const,
      findingsCount: 6,
      createdAt: '2026-07-28T04:00:00.000Z',
    },
  ],
};

vi.mock('@/features/audit/hooks/use-audit', () => ({
  // Nada foi clicado nesta sessão: a mutação não tem dados.
  useRunPortfolioAudit: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    data: undefined,
  }),
  useLatestAudit: () => ({ data: ULTIMA, isLoading: false }),
  useAuditDetail: () => ({ data: undefined, isLoading: false }),
}));

describe('AuditView — última auditoria', () => {
  it('mostra o resultado anterior ao abrir a tela, sem clicar em nada', () => {
    render(<AuditView />);

    expect(screen.getByText('Empresa Com Problema')).toBeInTheDocument();
    expect(screen.getByText('Empresa Regular')).toBeInTheDocument();
  });

  it('não diz que nenhuma auditoria foi executada quando existe uma salva', () => {
    render(<AuditView />);

    expect(
      screen.queryByText(/nenhuma auditoria executada ainda/i),
    ).not.toBeInTheDocument();
  });

  it('mantém a ordem recebida do backend, com os problemas no topo', () => {
    render(<AuditView />);

    const nomes = screen
      .getAllByText(/^Empresa (Com Problema|Regular)$/)
      .map((el) => el.textContent);

    expect(nomes).toEqual(['Empresa Com Problema', 'Empresa Regular']);
  });
});
