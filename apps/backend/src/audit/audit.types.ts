import { z } from 'zod';
import type { AuditFinding, AuditRun } from '@prisma/client';
import type { AuditStatus, FindingResult, Severity } from './audit-engine';

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

export interface AuditFindingDto {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly result: FindingResult;
  readonly detail: string | null;
}

export interface AuditRunSummaryDto {
  readonly id: string;
  readonly companyId: string;
  /**
   * O `companyId` é um cuid, ilegível para quem lê o relatório. O nome vem
   * junto para a tela não precisar de uma segunda chamada por linha.
   */
  readonly companyName: string;
  readonly score: number;
  readonly status: AuditStatus;
  readonly findingsCount: number;
  readonly createdAt: string;
}

export interface AuditRunDetailDto extends AuditRunSummaryDto {
  readonly findings: readonly AuditFindingDto[];
}

/** Resultado da auditoria da carteira inteira (`POST /audit/run`). */
export interface PortfolioAuditDto {
  readonly total: number;
  readonly healthy: number;
  readonly attention: number;
  readonly critical: number;
  readonly runs: readonly AuditRunSummaryDto[];
}

/** A relação `company` é obrigatória no tipo para o `include` não ser esquecido. */
type WithCompany = { company: { name: string } };

export function toSummaryDto(
  run: AuditRun & WithCompany & { _count: { findings: number } },
): AuditRunSummaryDto {
  return {
    id: run.id,
    companyId: run.companyId,
    companyName: run.company.name,
    score: run.score,
    status: run.status as AuditStatus,
    findingsCount: run._count.findings,
    createdAt: run.createdAt.toISOString(),
  };
}

export function toDetailDto(
  run: AuditRun & WithCompany & { findings: AuditFinding[] },
): AuditRunDetailDto {
  return {
    id: run.id,
    companyId: run.companyId,
    companyName: run.company.name,
    score: run.score,
    status: run.status as AuditStatus,
    findingsCount: run.findings.length,
    createdAt: run.createdAt.toISOString(),
    findings: run.findings.map((f) => ({
      code: f.code,
      severity: f.severity as Severity,
      message: f.message,
      result: f.result as FindingResult,
      detail: f.detail,
    })),
  };
}
