import { z } from 'zod';

export const companyStatusSchema = z.enum(['active', 'inactive', 'pending']);

export const partnerSchema = z.object({
  id: z.string(),
  nome: z.string(),
  qualificacao: z.string(),
  faixaEtaria: z.string().nullable(),
});

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  tradeName: z.string(),
  cnpj: z.string(),
  status: companyStatusSchema,
  situacaoCadastral: z.string(),
  cnaeCodigo: z.string(),
  cnaeDescricao: z.string(),
  porte: z.string(),
  naturezaJuridica: z.string().nullable(),
  dataAbertura: z.string().nullable(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  phone: z.string(),
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string().nullable(),
  bairro: z.string(),
  cep: z.string(),
  city: z.string(),
  state: z.string(),
  healthScore: z.number().min(0).max(100),
  createdAt: z.string(),
  partners: z.array(partnerSchema),
});

export const createCompanySchema = companySchema.omit({
  id: true,
  healthScore: true,
  createdAt: true,
  partners: true,
  situacaoCadastral: true,
  cnaeCodigo: true,
  cnaeDescricao: true,
  porte: true,
  naturezaJuridica: true,
  dataAbertura: true,
});

/**
 * Edição: os mesmos campos do cadastro, menos o CNPJ — ver `UpdateCompanyInput`
 * em `types/company.types.ts` para o porquê.
 */
export const updateCompanySchema = createCompanySchema.omit({ cnpj: true });

export const companyListSchema = z.array(companySchema);
