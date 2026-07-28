import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { MOCK_AUDIT_RUNS, MOCK_PORTFOLIO_AUDIT } from '@/services/mocks/audit.mock';
import type { ApiResponse } from '@/types/api.types';
import type { AuditRunDetail, PortfolioAudit } from '@/features/audit/types/audit.types';

export const auditService = {
  // O backend ainda não expõe `POST /audit/run` (Task 14) — em modo mock,
  // devolve o resultado pronto para não bloquear o desenvolvimento do front.
  async runPortfolio(): Promise<PortfolioAudit> {
    if (config.useMocks) {
      return MOCK_PORTFOLIO_AUDIT;
    }
    const response = await httpClient.post<ApiResponse<PortfolioAudit>>('/audit/run');
    return response.data;
  },

  /** Última auditoria de cada empresa. `null` quando nunca se auditou. */
  async getLatest(signal?: AbortSignal): Promise<PortfolioAudit | null> {
    if (config.useMocks) {
      return MOCK_PORTFOLIO_AUDIT;
    }
    const response = await httpClient.get<ApiResponse<PortfolioAudit | null>>(
      '/audit/latest',
      { signal },
    );
    return response.data;
  },

  async getById(id: string, signal?: AbortSignal): Promise<AuditRunDetail> {
    if (config.useMocks) {
      const run = MOCK_AUDIT_RUNS.find((item) => item.id === id);
      if (!run) {
        throw new Error(`Auditoria não encontrada: ${id}`);
      }
      return run;
    }
    const response = await httpClient.get<ApiResponse<AuditRunDetail>>(`/audit/${id}`, { signal });
    return response.data;
  },
} as const;
