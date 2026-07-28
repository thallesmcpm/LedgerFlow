import { z } from 'zod';
import type { Company as PrismaCompany, Partner } from '@prisma/client';
import { toPartnerDto, type PartnerDto } from './partner.schema';

export const companyStatusSchema = z.enum(['active', 'inactive', 'pending']);
export type CompanyStatus = z.infer<typeof companyStatusSchema>;

/** Espelha o createCompanySchema do frontend, com validação de CNPJ. */
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  tradeName: z.string().min(1, 'Nome fantasia é obrigatório'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos (somente números)'),
  status: companyStatusSchema.default('pending'),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  phone: z.string().default(''),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'UF deve ter 2 letras'),
  logradouro: z.string().default(''),
  numero: z.string().default(''),
  complemento: z.string().nullable().default(null),
  bairro: z.string().default(''),
  cep: z.string().default(''),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional().default(''),
  state: z.string().length(2).optional(),
  porte: z.string().optional(),
  situacao: z.string().optional(),
  cnae: z.string().optional(),
  /**
   * Atalho para «tudo que não é ATIVA». Existe porque `situacao` compara por
   * igualdade, e irregular é uma negação — ver `company-filters.ts`.
   */
  irregular: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;

export type CompanyWithPartners = PrismaCompany & { partners?: Partner[] };

/** Shape exposto ao frontend (sem campos internos como tenantId/updatedAt). */
export interface CompanyDto {
  readonly id: string;
  readonly name: string;
  readonly tradeName: string;
  readonly cnpj: string;
  readonly status: CompanyStatus;
  readonly situacaoCadastral: string;
  readonly cnaeCodigo: string;
  readonly cnaeDescricao: string;
  readonly porte: string;
  readonly naturezaJuridica: string | null;
  readonly dataAbertura: string | null;
  readonly email: string;
  readonly phone: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cep: string;
  readonly city: string;
  readonly state: string;
  readonly healthScore: number;
  readonly createdAt: string;
  readonly partners: readonly PartnerDto[];
}

export function toCompanyDto(company: CompanyWithPartners): CompanyDto {
  return {
    id: company.id,
    name: company.name,
    tradeName: company.tradeName,
    cnpj: company.cnpj,
    status: company.status as CompanyStatus,
    situacaoCadastral: company.situacaoCadastral,
    cnaeCodigo: company.cnaeCodigo,
    cnaeDescricao: company.cnaeDescricao,
    porte: company.porte,
    naturezaJuridica: company.naturezaJuridica,
    dataAbertura: company.dataAbertura?.toISOString() ?? null,
    email: company.email,
    phone: company.phone,
    logradouro: company.logradouro,
    numero: company.numero,
    complemento: company.complemento,
    bairro: company.bairro,
    cep: company.cep,
    city: company.city,
    state: company.state,
    healthScore: company.healthScore,
    createdAt: company.createdAt.toISOString(),
    partners: (company.partners ?? []).map(toPartnerDto),
  };
}
