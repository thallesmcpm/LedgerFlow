import { buildCompanyWhere, ACTIVE_SITUACAO } from './company-filters';
import type { ListCompaniesQuery } from './company.schema';

/**
 * A tela de empresas ganhou cartões que filtram a lista. «Situação ativa»
 * casava com o filtro exato que já existia, mas «Situação irregular» é
 * *tudo que não é ATIVA* — e não havia como pedir isso à API.
 */
function query(overrides: Partial<ListCompaniesQuery> = {}): ListCompaniesQuery {
  return { page: 1, pageSize: 10, search: '', ...overrides } as ListCompaniesQuery;
}

describe('buildCompanyWhere', () => {
  it('sempre restringe ao tenant', () => {
    expect(buildCompanyWhere('tnt_1', query())).toMatchObject({
      tenantId: 'tnt_1',
    });
  });

  it('filtra situação irregular como "tudo que não é ATIVA"', () => {
    const where = buildCompanyWhere('tnt_1', query({ irregular: true }));

    expect(where.NOT).toEqual({ situacaoCadastral: ACTIVE_SITUACAO });
  });

  it('não restringe a situação quando irregular não é pedido', () => {
    const where = buildCompanyWhere('tnt_1', query());

    expect(where.NOT).toBeUndefined();
  });

  it('mantém o filtro exato de situação, que os gráficos usam', () => {
    const where = buildCompanyWhere('tnt_1', query({ situacao: 'BAIXADA' }));

    expect(where.situacaoCadastral).toBe('BAIXADA');
    expect(where.NOT).toBeUndefined();
  });

  it('busca por nome, nome fantasia e CNPJ, ignorando maiúsculas no texto', () => {
    const where = buildCompanyWhere('tnt_1', query({ search: 'petrobras' }));

    expect(where.OR).toEqual([
      { name: { contains: 'petrobras', mode: 'insensitive' } },
      { tradeName: { contains: 'petrobras', mode: 'insensitive' } },
      { cnpj: { contains: 'petrobras' } },
    ]);
  });

  it('combina irregular com os demais filtros', () => {
    const where = buildCompanyWhere(
      'tnt_1',
      query({ irregular: true, state: 'SP' }),
    );

    expect(where.state).toBe('SP');
    expect(where.NOT).toEqual({ situacaoCadastral: ACTIVE_SITUACAO });
  });
});
