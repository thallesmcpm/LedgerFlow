import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditView } from './audit-view';

/**
 * A lista de auditoria imprimia `companyId` — o cuid do banco. Quem rodava
 * "Auditar carteira" via linhas de `cms40eo9a0009f6q8k11emvrc` no lugar dos
 * nomes das empresas.
 */
vi.mock('@/features/audit/hooks/use-audit', () => ({
  useRunPortfolioAudit: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    data: {
      total: 1,
      healthy: 0,
      attention: 0,
      critical: 1,
      runs: [
        {
          id: 'aud_1',
          companyId: 'cms40eo9a0009f6q8k11emvrc',
          companyName: 'Transportes Rápido EIRELI',
          score: 45,
          status: 'critical',
          findingsCount: 6,
          createdAt: '2026-07-28T04:00:00.000Z',
        },
      ],
    },
  }),
  useAuditDetail: () => ({ data: undefined, isLoading: false }),
}));

describe('AuditView', () => {
  it('mostra o nome da empresa na lista de auditorias', () => {
    render(<AuditView />);

    expect(screen.getByText('Transportes Rápido EIRELI')).toBeInTheDocument();
  });

  it('não expõe o id interno da empresa na tela', () => {
    render(<AuditView />);

    expect(screen.queryByText('cms40eo9a0009f6q8k11emvrc')).not.toBeInTheDocument();
  });
});
