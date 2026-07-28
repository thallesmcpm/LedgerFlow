import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { BrasilApiService } from '../brasil-api/brasil-api.service';
import { paginated, type Paginated } from '../common/pagination';
import { mapWithConcurrency } from '../common/concurrency';
import { runAudit, normalizeName, type AuditContext } from './audit-engine';
import { orderBySeverity } from './audit-ordering';
import {
  toDetailDto,
  toSummaryDto,
  type AuditRunDetailDto,
  type AuditRunSummaryDto,
  type ListAuditQuery,
  type PortfolioAuditDto,
} from './audit.types';

/** Concorrência máxima ao persistir auditorias da carteira (spec §2.1). */
const AUDIT_CONCURRENCY = 5;

/**
 * Resumo da carteira auditada. Usado tanto pela execução nova quanto pela
 * leitura da última, para as duas saírem contadas e ordenadas igual — se
 * divergissem, recarregar a página mudaria a tela sem nada ter mudado.
 */
function toPortfolioDto(
  runs: readonly AuditRunSummaryDto[],
): PortfolioAuditDto {
  return {
    total: runs.length,
    healthy: runs.filter((r) => r.status === 'healthy').length,
    attention: runs.filter((r) => r.status === 'attention').length,
    critical: runs.filter((r) => r.status === 'critical').length,
    runs: orderBySeverity(runs),
  };
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly brasilApi: BrasilApiService,
  ) {}

  /**
   * Audita a carteira inteira (decisão A2 da spec): reconsulta a BrasilAPI
   * com concorrência limitada e detecta duplicatas comparando as empresas
   * entre si — o que só é possível com a carteira toda em mãos. Nunca corrige
   * nada sozinho; apenas relata as divergências para o usuário decidir.
   */
  async runForPortfolio(
    tenantId: string,
    actorId: string,
  ): Promise<PortfolioAuditDto> {
    const companies = await this.prisma.company.findMany({
      where: { tenantId },
    });

    if (companies.length === 0) {
      return { total: 0, healthy: 0, attention: 0, critical: 0, runs: [] };
    }

    const official = await this.brasilApi.lookupMany(
      companies.map((c) => c.cnpj),
    );

    // Índice de duplicatas: mesmo CNPJ ou mesma razão social normalizada.
    const byKey = new Map<string, string[]>();
    for (const company of companies) {
      for (const key of [
        `cnpj:${company.cnpj}`,
        `name:${normalizeName(company.name)}`,
      ]) {
        byKey.set(key, [...(byKey.get(key) ?? []), company.id]);
      }
    }

    const runs = await mapWithConcurrency(companies, AUDIT_CONCURRENCY, async (company) => {
      const duplicateOf = [
        ...new Set(
          [`cnpj:${company.cnpj}`, `name:${normalizeName(company.name)}`]
            .flatMap((key) => byKey.get(key) ?? [])
            .filter((id) => id !== company.id),
        ),
      ];

      const context: AuditContext = {
        official: official.get(company.cnpj) ?? null,
        duplicateOf,
      };

      return this.persistRun(tenantId, company.id, runAudit(company, context));
    });

    await this.activity.record({
      tenantId,
      actorId,
      action: 'audit.portfolio_completed',
      entityType: 'tenant',
      entityId: tenantId,
      metadata: { total: runs.length },
    });

    return toPortfolioDto(runs);
  }

  /**
   * Última auditoria de cada empresa da carteira, para a tela abrir com o
   * resultado anterior em vez de vazia.
   *
   * As execuções sempre ficaram gravadas; o que faltava era lê-las. Sem isto,
   * recarregar a página apagava da vista um trabalho que pode ter levado
   * minutos e várias consultas à BrasilAPI.
   *
   * Devolve `null` quando o escritório nunca auditou — o que a tela distingue
   * de "auditou e está tudo certo".
   */
  async getLatestPortfolio(tenantId: string): Promise<PortfolioAuditDto | null> {
    const rows = await this.prisma.auditRun.findMany({
      where: { tenantId },
      // `distinct` + este `orderBy` devolve a execução mais recente de cada
      // empresa: o Postgres resolve como DISTINCT ON. A ordem final de leitura
      // é aplicada depois, por gravidade.
      distinct: ['companyId'],
      orderBy: [{ companyId: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { findings: true } },
        company: { select: { name: true } },
      },
    });

    if (rows.length === 0) {
      return null;
    }

    return toPortfolioDto(rows.map(toSummaryDto));
  }

  async runForCompany(
    tenantId: string,
    actorId: string,
    companyId: string,
  ): Promise<AuditRunDetailDto> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const duplicates = await this.prisma.company.findMany({
      where: {
        tenantId,
        id: { not: companyId },
        OR: [{ cnpj: company.cnpj }, { name: company.name }],
      },
      select: { id: true },
    });

    const context: AuditContext = {
      official: await this.brasilApi.lookupCnpj(company.cnpj),
      duplicateOf: duplicates.map((d) => d.id),
    };

    const summary = await this.persistRun(
      tenantId,
      companyId,
      runAudit(company, context),
    );

    await this.activity.record({
      tenantId,
      actorId,
      action: 'audit.completed',
      entityType: 'company',
      entityId: companyId,
      metadata: { score: summary.score, status: summary.status },
    });

    return this.getById(tenantId, summary.id);
  }

  async list(
    tenantId: string,
    query: ListAuditQuery,
  ): Promise<Paginated<AuditRunSummaryDto>> {
    const { page, pageSize } = query;
    const where = { tenantId };

    const [total, rows] = await Promise.all([
      this.prisma.auditRun.count({ where }),
      this.prisma.auditRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { findings: true } },
          company: { select: { name: true } },
        },
      }),
    ]);

    return paginated(rows.map(toSummaryDto), page, pageSize, total);
  }

  async getById(tenantId: string, id: string): Promise<AuditRunDetailDto> {
    const run = await this.prisma.auditRun.findFirst({
      where: { id, tenantId },
      include: { findings: true, company: { select: { name: true } } },
    });
    if (!run) {
      throw new NotFoundException('Auditoria não encontrada');
    }
    return toDetailDto(run);
  }

  /** Grava o resultado da auditoria e atualiza o score da empresa. */
  private async persistRun(
    tenantId: string,
    companyId: string,
    result: ReturnType<typeof runAudit>,
  ): Promise<AuditRunSummaryDto> {
    const run = await this.prisma.auditRun.create({
      data: {
        tenantId,
        companyId,
        score: result.score,
        status: result.status,
        findings: {
          create: result.findings.map((f) => ({
            code: f.code,
            severity: f.severity,
            message: f.message,
            result: f.result,
            detail: f.detail,
          })),
        },
      },
      include: {
        _count: { select: { findings: true } },
        company: { select: { name: true } },
      },
    });

    await this.prisma.company.update({
      where: { id: companyId },
      data: { healthScore: result.score },
    });

    return toSummaryDto(run);
  }
}
