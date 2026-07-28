'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { auditService } from '@/features/audit/services/audit.service';
import { queryKeys } from '@/constants/query-keys';
import { useTenant } from '@/features/auth/hooks/use-tenant';

export function useRunPortfolioAudit() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: () => auditService.runPortfolio(),
    // A execução nova passa a ser a última: sem invalidar, sair da tela e
    // voltar mostraria o resultado anterior.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.audit.all(tenantId),
      }),
  });
}

/** Última auditoria salva, para a tela não abrir vazia. */
export function useLatestAudit() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: [...queryKeys.audit.all(tenantId), 'latest'] as const,
    queryFn: ({ signal }) => auditService.getLatest(signal),
  });
}

export function useAuditDetail(id: string | null) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: queryKeys.audit.detail(tenantId, id ?? ''),
    queryFn: ({ signal }) => auditService.getById(id as string, signal),
    enabled: id !== null,
  });
}
