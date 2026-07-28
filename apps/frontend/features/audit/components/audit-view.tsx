'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { FindingBadge } from '@/features/audit/components/finding-badge';
import {
  useRunPortfolioAudit,
  useAuditDetail,
  useLatestAudit,
} from '@/features/audit/hooks/use-audit';
import type { AuditStatus } from '@/features/audit/types/audit.types';

const STATUS_LABELS: Record<AuditStatus, string> = {
  healthy: 'Sem divergência',
  attention: 'Atenção',
  critical: 'Crítica',
};

const STATUS_VARIANTS: Record<AuditStatus, 'success' | 'warning' | 'destructive'> = {
  healthy: 'success',
  attention: 'warning',
  critical: 'destructive',
};

export function AuditView(): React.ReactNode {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { mutate, data: recemExecutada, isPending, isError } = useRunPortfolioAudit();
  const ultima = useLatestAudit();
  const detail = useAuditDetail(selectedRunId);

  /**
   * A execução desta sessão tem precedência sobre a salva: enquanto a
   * invalidação não chega, `ultima` ainda carrega o resultado anterior, e
   * mostrá-lo depois do clique pareceria que a auditoria não rodou.
   */
  const data = recemExecutada ?? ultima.data ?? undefined;

  function handleRunAudit(): void {
    setSelectedRunId(null);
    mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        description="Verifica CNPJ, duplicidade, razão social, endereço, situação cadastral e dados ausentes. As divergências ficam aqui para você decidir o que corrigir — o sistema nunca corrige sozinho."
        action={
          <Button onClick={handleRunAudit} disabled={isPending}>
            {isPending ? 'Auditando carteira...' : 'Auditar carteira'}
          </Button>
        }
      />

      {isError ? (
        <EmptyState
          icon={ShieldAlert}
          title="Falha na auditoria"
          description="Não foi possível auditar a carteira. Tente novamente em instantes."
        />
      ) : null}

      {/*
        Só depois de consultar: enquanto `ultima` carrega, anunciar "nenhuma
        auditoria" seria mentira que pisca na tela a cada abertura.
      */}
      {!data && !isError && !ultima.isLoading ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhuma auditoria executada ainda"
          description='Clique em "Auditar carteira" para verificar CNPJs, duplicidades, endereços e situação cadastral de todas as empresas.'
        />
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* StatCard usa a prop `title`, não `label`. */}
            <StatCard title="Empresas auditadas" value={String(data.total)} icon={Building2} />
            <StatCard title="Sem divergência" value={String(data.healthy)} icon={ShieldCheck} />
            <StatCard title="Atenção" value={String(data.attention)} icon={ShieldAlert} />
            <StatCard title="Críticas" value={String(data.critical)} icon={ShieldX} />
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card className="divide-y p-0">
              {data.runs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhuma empresa na carteira.</p>
              ) : (
                data.runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/50',
                      selectedRunId === run.id ? 'bg-muted/50' : undefined,
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">{run.companyName}</p>
                      <Badge variant={STATUS_VARIANTS[run.status]}>{STATUS_LABELS[run.status]}</Badge>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{run.score}/100</span>
                  </button>
                ))
              )}
            </Card>

            <Card className="space-y-4 p-4">
              {detail.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando divergências...</p>
              ) : detail.data ? (
                <>
                  <ul className="space-y-3">
                    {detail.data.findings.map((finding) => (
                      <li key={finding.code} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{finding.message}</p>
                          {finding.detail ? (
                            <p className="text-xs text-muted-foreground">{finding.detail}</p>
                          ) : null}
                        </div>
                        <FindingBadge result={finding.result} />
                      </li>
                    ))}
                  </ul>
                  {/* O brief pede que o usuário decida o que corrigir — o
                      sistema nunca corrige sozinho. Este link leva ao cadastro. */}
                  <Link
                    href={`/companies/${detail.data.companyId}`}
                    className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Corrigir cadastro desta empresa
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecione uma empresa para ver as divergências.
                </p>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
