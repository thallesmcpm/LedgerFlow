import type { Prisma } from '@prisma/client';
import type { ListCompaniesQuery } from './company.schema';

/**
 * Valor que a Receita Federal usa para empresa regular. Tudo que difere disto
 * — INAPTA, BAIXADA, SUSPENSA, NULA — conta como irregular.
 */
export const ACTIVE_SITUACAO = 'ATIVA';

/**
 * Monta o `where` da listagem de empresas.
 *
 * Vive fora do service para poder ser testado sem banco: a combinação de
 * filtros é a parte com regra de negócio, e o resto da consulta é encanamento
 * do Prisma.
 */
export function buildCompanyWhere(
  tenantId: string,
  query: ListCompaniesQuery,
): Prisma.CompanyWhereInput {
  const where: Prisma.CompanyWhereInput = { tenantId };

  if (query.search) {
    // `insensitive` é obrigatório no Postgres: sem ele, procurar por
    // "petrobras" não encontra "PETROBRAS". O SQLite anterior ignorava
    // maiúsculas por conta própria e escondia essa necessidade.
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { tradeName: { contains: query.search, mode: 'insensitive' } },
      { cnpj: { contains: query.search } },
    ];
  }
  if (query.state) {
    where.state = query.state;
  }
  if (query.porte) {
    where.porte = query.porte;
  }
  if (query.situacao) {
    where.situacaoCadastral = query.situacao;
  }
  if (query.cnae) {
    where.cnaeCodigo = query.cnae;
  }
  /**
   * «Situação irregular» é uma negação, não um valor: o cartão da tela de
   * empresas conta o mesmo que o dashboard, que já definia irregular como
   * `NOT situacaoCadastral = ATIVA`. Sem este parâmetro o filtro exato não
   * daria conta — teria de listar todos os valores irregulares possíveis.
   */
  if (query.irregular) {
    where.NOT = { situacaoCadastral: ACTIVE_SITUACAO };
  }

  return where;
}
