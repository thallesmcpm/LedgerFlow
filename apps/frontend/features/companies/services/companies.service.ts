import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { MOCK_COMPANIES } from '@/services/mocks/companies.mock';
import type {
  CnpjLookup,
  Company,
  CompanyFilters,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '@/features/companies/types/company.types';
import type { PaginatedResponse, ApiResponse } from '@/types/api.types';
import type { QueryParams } from '@/types/common.types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export type CompanyListParams = QueryParams & CompanyFilters;

function matchesFilters(company: Company, params?: CompanyListParams): boolean {
  if (!params) {
    return true;
  }
  if (params.state && company.state !== params.state) {
    return false;
  }
  if (params.porte && company.porte !== params.porte) {
    return false;
  }
  if (params.situacao && company.situacaoCadastral !== params.situacao) {
    return false;
  }
  if (params.cnae && company.cnaeCodigo !== params.cnae) {
    return false;
  }
  return true;
}

function paginate(items: readonly Company[], params?: CompanyListParams): PaginatedResponse<Company> {
  const page = params?.page ?? DEFAULT_PAGE;
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = params?.search?.trim().toLowerCase() ?? '';

  const bySearch = search.length > 0
    ? items.filter((company) => company.name.toLowerCase().includes(search) || company.tradeName.toLowerCase().includes(search) || company.cnpj.includes(search))
    : items;
  const filtered = bySearch.filter((company) => matchesFilters(company, params));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, pagination: { page, pageSize, total, totalPages } };
}

function buildQueryString(params?: CompanyListParams): string {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.pageSize) {
    search.set('pageSize', String(params.pageSize));
  }
  if (params.search) {
    search.set('search', params.search);
  }
  for (const key of ['state', 'porte', 'situacao', 'cnae'] as const) {
    const value = params[key];
    if (typeof value === 'string' && value.length > 0) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * Devolve um preview de CNPJ plausível no modo mock. O backend ainda não
 * expõe `GET /companies/lookup/:cnpj` com dados reais, então, para a tela
 * de onboarding funcionar em modo demo, reaproveitamos uma empresa do mock
 * quando o CNPJ digitado corresponde a uma delas, e caimos para dados
 * fictícios genéricos caso contrário.
 */
function buildMockCnpjLookup(cnpj: string): CnpjLookup {
  const digits = cnpj.replace(/\D/g, '');
  const match = MOCK_COMPANIES.find((company) => company.cnpj === digits);

  if (match) {
    return {
      cnpj: match.cnpj,
      razaoSocial: match.name,
      nomeFantasia: match.tradeName,
      situacao: match.situacaoCadastral,
      cnaeCodigo: match.cnaeCodigo,
      cnaeDescricao: match.cnaeDescricao,
      porte: match.porte,
      naturezaJuridica: match.naturezaJuridica,
      dataAbertura: match.dataAbertura,
      logradouro: match.logradouro,
      numero: match.numero,
      complemento: match.complemento,
      bairro: match.bairro,
      cep: match.cep,
      municipio: match.city,
      uf: match.state,
      email: match.email || null,
      telefone: match.phone || null,
      socios: match.partners.map((partner) => ({
        nome: partner.nome,
        qualificacao: partner.qualificacao,
        faixaEtaria: partner.faixaEtaria,
      })),
    };
  }

  return {
    cnpj: digits,
    razaoSocial: 'Empresa Demonstração LTDA',
    nomeFantasia: 'Empresa Demo',
    situacao: 'ATIVA',
    cnaeCodigo: '6201500',
    cnaeDescricao: 'Desenvolvimento de programas de computador sob encomenda',
    porte: 'ME',
    naturezaJuridica: 'Sociedade Empresária Limitada',
    dataAbertura: '2015-06-10',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    complemento: null,
    bairro: 'Bela Vista',
    cep: '01310100',
    municipio: 'São Paulo',
    uf: 'SP',
    email: 'contato@empresademo.com.br',
    telefone: '1140028922',
    socios: [
      { nome: 'Sócio Demonstração', qualificacao: 'Administrador', faixaEtaria: '31 a 40 anos' },
    ],
  };
}

export const companiesService = {
  async list(params?: CompanyListParams, signal?: AbortSignal): Promise<PaginatedResponse<Company>> {
    if (config.useMocks) {
      return paginate(MOCK_COMPANIES, params);
    }
    return httpClient.get<PaginatedResponse<Company>>(`/companies${buildQueryString(params)}`, { signal });
  },

  async getById(companyId: string, signal?: AbortSignal): Promise<Company> {
    if (config.useMocks) {
      const company = MOCK_COMPANIES.find((item) => item.id === companyId);
      if (!company) {
        throw new Error(`Empresa não encontrada: ${companyId}`);
      }
      return company;
    }
    const response = await httpClient.get<ApiResponse<Company>>(`/companies/${companyId}`, { signal });
    return response.data;
  },

  async create(input: CreateCompanyInput): Promise<Company> {
    if (config.useMocks) {
      return {
        ...input,
        id: `cmp_${Date.now()}`,
        situacaoCadastral: '',
        cnaeCodigo: '',
        cnaeDescricao: '',
        porte: '',
        naturezaJuridica: null,
        dataAbertura: null,
        healthScore: 100,
        createdAt: new Date().toISOString(),
        partners: [],
      };
    }
    const response = await httpClient.post<ApiResponse<Company>>('/companies', input);
    return response.data;
  },

  async update(companyId: string, input: UpdateCompanyInput): Promise<Company> {
    if (config.useMocks) {
      const company = MOCK_COMPANIES.find((item) => item.id === companyId);
      if (!company) {
        throw new Error(`Empresa não encontrada: ${companyId}`);
      }
      return { ...company, ...input };
    }
    const response = await httpClient.patch<ApiResponse<Company>>(
      `/companies/${companyId}`,
      input,
    );
    return response.data;
  },

  async lookupCnpj(cnpj: string, signal?: AbortSignal): Promise<CnpjLookup | null> {
    if (config.useMocks) {
      return buildMockCnpjLookup(cnpj);
    }
    const response = await httpClient.get<ApiResponse<CnpjLookup | null>>(
      `/companies/lookup/${cnpj}`,
      { signal },
    );
    return response.data;
  },
} as const;
