'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesService } from '@/features/companies/services/companies.service';
import { queryKeys } from '@/constants/query-keys';
import { useTenant } from '@/features/auth/hooks/use-tenant';
import type { UpdateCompanyInput } from '@/features/companies/types/company.types';

export function useUpdateCompany(companyId: string) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: (input: UpdateCompanyInput) =>
      companiesService.update(companyId, input),
    onSuccess: async () => {
      // A ficha aberta e a listagem mostram os mesmos campos: invalidar só o
      // detalhe deixaria a tabela exibindo o nome antigo até o próximo reload.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.companies.detail(tenantId, companyId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.companies.all(tenantId),
      });
    },
  });
}
