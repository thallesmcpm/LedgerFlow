export type FindingResult = 'passed' | 'failed' | 'skipped';
export type AuditStatus = 'healthy' | 'attention' | 'critical';

export interface AuditFinding {
  readonly code: string;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly message: string;
  readonly result: FindingResult;
  readonly detail: string | null;
}

export interface AuditRunSummary {
  readonly id: string;
  readonly companyId: string;
  /** Espelha o DTO do backend: o id é cuid, ilegível para quem lê o relatório. */
  readonly companyName: string;
  readonly score: number;
  readonly status: AuditStatus;
  readonly findingsCount: number;
  readonly createdAt: string;
}

export interface AuditRunDetail extends AuditRunSummary {
  readonly findings: readonly AuditFinding[];
}

export interface PortfolioAudit {
  readonly total: number;
  readonly healthy: number;
  readonly attention: number;
  readonly critical: number;
  readonly runs: readonly AuditRunSummary[];
}
