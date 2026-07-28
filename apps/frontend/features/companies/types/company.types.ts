export type CompanyStatus = 'active' | 'inactive' | 'pending';

export interface Partner {
  readonly id: string;
  readonly nome: string;
  readonly qualificacao: string;
  readonly faixaEtaria: string | null;
}

export interface Company {
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
  readonly partners: readonly Partner[];
}

export type CreateCompanyInput = Omit<
  Company,
  | 'id'
  | 'healthScore'
  | 'createdAt'
  | 'partners'
  | 'situacaoCadastral'
  | 'cnaeCodigo'
  | 'cnaeDescricao'
  | 'porte'
  | 'naturezaJuridica'
  | 'dataAbertura'
>;

/**
 * Campos que a tela de edição envia em `PATCH /companies/:id`.
 *
 * O CNPJ fica de fora de propósito: ele identifica a empresa, alimenta a
 * auditoria e a consulta à Receita. Corrigir um CNPJ errado é apagar e
 * recadastrar — assim ninguém troca o identificador por engano.
 *
 * Os campos vindos da Receita (situação, CNAE, porte) também ficam fora: quem
 * manda neles é a BrasilAPI, não o usuário.
 */
export type UpdateCompanyInput = Omit<CreateCompanyInput, 'cnpj'>;

/** Resposta de GET /companies/lookup/:cnpj — dados oficiais antes de salvar. */
export interface CnpjLookup {
  readonly cnpj: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly situacao: string;
  readonly cnaeCodigo: string;
  readonly cnaeDescricao: string;
  readonly porte: string;
  readonly naturezaJuridica: string | null;
  readonly dataAbertura: string | null;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cep: string;
  readonly municipio: string;
  readonly uf: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly socios: readonly { nome: string; qualificacao: string; faixaEtaria: string | null }[];
}

export interface CompanyFilters {
  readonly state?: string;
  readonly porte?: string;
  readonly situacao?: string;
  readonly cnae?: string;
}
