import type { AuditStatus } from './audit-engine';
import type { AuditRunSummaryDto } from './audit.types';

/**
 * Peso de exibição: quanto menor, mais acima na lista. Não é o mesmo que a
 * gravidade do motor — aqui só decide ordem de leitura.
 */
const PESO: Record<AuditStatus, number> = {
  critical: 0,
  attention: 1,
  healthy: 2,
};

/**
 * Ordena a carteira auditada para leitura: problemas primeiro.
 *
 * Sem isto a lista sai na ordem em que o motor terminou cada empresa — que
 * depende de concorrência e da latência da BrasilAPI, ou seja, muda a cada
 * execução. Quem abre a auditoria quer as críticas no topo, e quer encontrar
 * a mesma empresa no mesmo lugar ao voltar.
 *
 * Devolve um array novo; o recebido não é alterado.
 */
export function orderBySeverity(
  runs: readonly AuditRunSummaryDto[],
): AuditRunSummaryDto[] {
  return [...runs].sort((a, b) => {
    const porStatus = PESO[a.status] - PESO[b.status];
    if (porStatus !== 0) {
      return porStatus;
    }
    // Mesma faixa: a pior nota primeiro.
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    // Desempate estável, para a ordem não dançar entre execuções iguais.
    return a.companyName.localeCompare(b.companyName, 'pt-BR');
  });
}
