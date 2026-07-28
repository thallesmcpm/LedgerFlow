import { toDetailDto, toSummaryDto } from './audit.types';

/**
 * A tela de auditoria listava `companyId` — o cuid cru do banco — porque o DTO
 * não carregava o nome. Quem abria o relatório via uma coluna de
 * `cms40eo9a0009f6q8k11emvrc` em vez da carteira de clientes.
 */
const CREATED_AT = new Date('2026-07-28T04:00:00.000Z');

function runRow() {
  return {
    id: 'aud_1',
    tenantId: 'tnt_dev',
    companyId: 'cmp_1',
    score: 45,
    status: 'critical',
    createdAt: CREATED_AT,
    company: { name: 'Transportes Rápido EIRELI' },
  };
}

describe('toSummaryDto', () => {
  it('expõe o nome da empresa junto do id', () => {
    const dto = toSummaryDto({ ...runRow(), _count: { findings: 6 } });

    expect(dto.companyName).toBe('Transportes Rápido EIRELI');
  });

  it('mantém o companyId, que a tela usa no link para a empresa', () => {
    const dto = toSummaryDto({ ...runRow(), _count: { findings: 6 } });

    expect(dto.companyId).toBe('cmp_1');
  });
});

describe('toDetailDto', () => {
  it('expõe o nome da empresa', () => {
    const dto = toDetailDto({ ...runRow(), findings: [] });

    expect(dto.companyName).toBe('Transportes Rápido EIRELI');
  });
});
