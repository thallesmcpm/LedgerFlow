import { orderBySeverity } from './audit-ordering';
import type { AuditRunSummaryDto } from './audit.types';
import type { AuditStatus } from './audit-engine';

/**
 * A carteira aparecia na ordem em que o motor terminava cada empresa — ou
 * seja, ao acaso. Quem abre a auditoria quer ver primeiro o que está errado,
 * não rolar a lista atrás das críticas.
 */
function run(
  id: string,
  status: AuditStatus,
  score: number,
): AuditRunSummaryDto {
  return {
    id,
    companyId: `cmp_${id}`,
    companyName: `Empresa ${id}`,
    score,
    status,
    findingsCount: 6,
    createdAt: '2026-07-28T04:00:00.000Z',
  };
}

describe('orderBySeverity', () => {
  it('põe as críticas antes das de atenção, e estas antes das saudáveis', () => {
    const ordenado = orderBySeverity([
      run('a', 'healthy', 100),
      run('b', 'critical', 10),
      run('c', 'attention', 70),
    ]);

    expect(ordenado.map((r) => r.status)).toEqual([
      'critical',
      'attention',
      'healthy',
    ]);
  });

  it('dentro do mesmo status, mostra a pior nota primeiro', () => {
    const ordenado = orderBySeverity([
      run('a', 'critical', 45),
      run('b', 'critical', 10),
      run('c', 'critical', 30),
    ]);

    expect(ordenado.map((r) => r.score)).toEqual([10, 30, 45]);
  });

  it('desempata pelo nome, para a ordem não mudar entre execuções', () => {
    const zebra = { ...run('z', 'healthy', 100), companyName: 'Zebra' };
    const alfa = { ...run('a', 'healthy', 100), companyName: 'Alfa' };

    expect(orderBySeverity([zebra, alfa]).map((r) => r.companyName)).toEqual([
      'Alfa',
      'Zebra',
    ]);
  });

  it('não altera o array recebido', () => {
    const original = [run('a', 'healthy', 100), run('b', 'critical', 10)];

    orderBySeverity(original);

    expect(original.map((r) => r.status)).toEqual(['healthy', 'critical']);
  });
});
