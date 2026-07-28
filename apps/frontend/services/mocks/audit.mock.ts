import type { AuditRunDetail, PortfolioAudit } from '@/features/audit/types/audit.types';

const NOW = new Date().toISOString();

/**
 * Uma execução por empresa de `MOCK_COMPANIES`, cobrindo as 6 regras do
 * motor de auditoria (`cnpj_invalido`, `empresa_duplicada`,
 * `razao_social_divergente`, `endereco_desatualizado`, `situacao_irregular`,
 * `dados_ausentes`). Inclui ao menos um `failed` com `detail` preenchido e
 * um `skipped` (BrasilAPI indisponível), como o motor real produz.
 */
export const MOCK_AUDIT_RUNS: readonly AuditRunDetail[] = [
  {
    id: 'run_cmp_001',
    companyId: 'cmp_001',
    companyName: 'PETROLEO BRASILEIRO S A PETROBRAS',
    score: 100,
    status: 'healthy',
    findingsCount: 6,
    createdAt: NOW,
    findings: [
      { code: 'cnpj_invalido', severity: 'critical', message: 'CNPJ com dígitos verificadores válidos', result: 'passed', detail: null },
      { code: 'empresa_duplicada', severity: 'critical', message: 'Nenhuma duplicidade encontrada na carteira', result: 'passed', detail: null },
      { code: 'razao_social_divergente', severity: 'warning', message: 'Razão social confere com a Receita Federal', result: 'passed', detail: null },
      { code: 'endereco_desatualizado', severity: 'warning', message: 'Endereço confere com o cadastro oficial', result: 'passed', detail: null },
      { code: 'situacao_irregular', severity: 'critical', message: 'Situação cadastral regular (ATIVA)', result: 'passed', detail: null },
      { code: 'dados_ausentes', severity: 'warning', message: 'Nenhum dado obrigatório ausente', result: 'passed', detail: null },
    ],
  },
  {
    id: 'run_cmp_002',
    companyId: 'cmp_002',
    companyName: 'MAGAZINE LUIZA S/A',
    score: 85,
    status: 'attention',
    findingsCount: 6,
    createdAt: NOW,
    findings: [
      { code: 'cnpj_invalido', severity: 'critical', message: 'CNPJ com dígitos verificadores válidos', result: 'passed', detail: null },
      { code: 'empresa_duplicada', severity: 'critical', message: 'Nenhuma duplicidade encontrada na carteira', result: 'passed', detail: null },
      { code: 'razao_social_divergente', severity: 'warning', message: 'Razão social confere com a Receita Federal', result: 'passed', detail: null },
      { code: 'endereco_desatualizado', severity: 'warning', message: 'Endereço confere com o cadastro oficial', result: 'passed', detail: null },
      {
        code: 'situacao_irregular',
        severity: 'critical',
        message: 'Não foi possível verificar a situação cadastral',
        result: 'skipped',
        detail: 'A BrasilAPI não respondeu durante esta auditoria. Rode a auditoria novamente para conferir a situação oficial.',
      },
      { code: 'dados_ausentes', severity: 'warning', message: 'Nenhum dado obrigatório ausente', result: 'passed', detail: null },
    ],
  },
  {
    id: 'run_cmp_003',
    companyId: 'cmp_003',
    companyName: 'BANCO DO BRASIL SA',
    score: 40,
    status: 'critical',
    findingsCount: 6,
    createdAt: NOW,
    findings: [
      { code: 'cnpj_invalido', severity: 'critical', message: 'CNPJ com dígitos verificadores válidos', result: 'passed', detail: null },
      { code: 'empresa_duplicada', severity: 'critical', message: 'Nenhuma duplicidade encontrada na carteira', result: 'passed', detail: null },
      {
        code: 'razao_social_divergente',
        severity: 'warning',
        message: 'Razão social diverge da Receita Federal',
        result: 'failed',
        detail: 'Cadastrada: "Indústria Verde SA" · Receita Federal: "INDUSTRIA VERDE SOCIEDADE ANONIMA".',
      },
      {
        code: 'endereco_desatualizado',
        severity: 'warning',
        message: 'Endereço diverge do cadastro oficial',
        result: 'failed',
        detail: 'CEP cadastrado 30130-000 diverge do CEP oficial 30140-071 (Belo Horizonte/MG).',
      },
      { code: 'situacao_irregular', severity: 'critical', message: 'Situação cadastral regular (ATIVA)', result: 'passed', detail: null },
      {
        code: 'dados_ausentes',
        severity: 'warning',
        message: 'Dados obrigatórios ausentes',
        result: 'failed',
        detail: 'Telefone não informado no cadastro.',
      },
    ],
  },
  {
    id: 'run_cmp_004',
    companyId: 'cmp_004',
    companyName: 'AMBEV S.A.',
    score: 20,
    status: 'critical',
    findingsCount: 6,
    createdAt: NOW,
    findings: [
      {
        code: 'cnpj_invalido',
        severity: 'critical',
        message: 'CNPJ com dígito verificador inválido',
        result: 'failed',
        detail: 'O CNPJ 32.165.498/0001-77 não passa na validação do módulo 11. Confira o número junto ao cliente.',
      },
      { code: 'empresa_duplicada', severity: 'critical', message: 'Nenhuma duplicidade encontrada na carteira', result: 'passed', detail: null },
      { code: 'razao_social_divergente', severity: 'warning', message: 'Razão social confere com a Receita Federal', result: 'passed', detail: null },
      { code: 'endereco_desatualizado', severity: 'warning', message: 'Endereço confere com o cadastro oficial', result: 'passed', detail: null },
      {
        code: 'situacao_irregular',
        severity: 'critical',
        message: 'Situação cadastral irregular',
        result: 'failed',
        detail: 'Situação oficial na Receita Federal: INAPTA. O cadastro interno está como "inactive".',
      },
      { code: 'dados_ausentes', severity: 'warning', message: 'Nenhum dado obrigatório ausente', result: 'passed', detail: null },
    ],
  },
  {
    id: 'run_cmp_005',
    companyId: 'cmp_005',
    companyName: 'VALE S.A.',
    score: 88,
    status: 'attention',
    findingsCount: 6,
    createdAt: NOW,
    findings: [
      { code: 'cnpj_invalido', severity: 'critical', message: 'CNPJ com dígitos verificadores válidos', result: 'passed', detail: null },
      {
        code: 'empresa_duplicada',
        severity: 'critical',
        message: 'Possível empresa duplicada na carteira',
        result: 'failed',
        detail: 'Mesma razão social localizada em "Distribuidora Norte Comércio SA" (CNPJ 78.912.345/0002-25).',
      },
      { code: 'razao_social_divergente', severity: 'warning', message: 'Razão social confere com a Receita Federal', result: 'passed', detail: null },
      { code: 'endereco_desatualizado', severity: 'warning', message: 'Endereço confere com o cadastro oficial', result: 'passed', detail: null },
      { code: 'situacao_irregular', severity: 'critical', message: 'Situação cadastral regular (ATIVA)', result: 'passed', detail: null },
      { code: 'dados_ausentes', severity: 'warning', message: 'Nenhum dado obrigatório ausente', result: 'passed', detail: null },
    ],
  },
];

function toSummary(run: AuditRunDetail): PortfolioAudit['runs'][number] {
  const { findings: _findings, ...summary } = run;
  return summary;
}

export const MOCK_PORTFOLIO_AUDIT: PortfolioAudit = {
  total: MOCK_AUDIT_RUNS.length,
  healthy: MOCK_AUDIT_RUNS.filter((run) => run.status === 'healthy').length,
  attention: MOCK_AUDIT_RUNS.filter((run) => run.status === 'attention').length,
  critical: MOCK_AUDIT_RUNS.filter((run) => run.status === 'critical').length,
  runs: MOCK_AUDIT_RUNS.map(toSummary),
};
