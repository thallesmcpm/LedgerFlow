'use client';

import { useState } from 'react';
import { Building2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { CompanyDetailCard } from '@/features/companies/components/company-detail-card';
import { CompanyForm } from '@/features/companies/components/company-form';
import { useCompany } from '@/features/companies/hooks/use-company';

interface CompanyDetailViewProps {
  readonly companyId: string;
}

export function CompanyDetailView({
  companyId,
}: CompanyDetailViewProps): React.ReactNode {
  const { data, isLoading, isError } = useCompany(companyId);
  const [editing, setEditing] = useState(false);

  if (isError) {
    return (
      <EmptyState
        icon={Building2}
        title="Empresa não encontrada"
        description="Verifique o endereço ou volte para a listagem de empresas."
      />
    );
  }

  if (isLoading || !data) {
    return <Loading />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="mr-2 size-4" /> Editar informações
        </Button>
      </div>

      <CompanyDetailCard company={data} />

      {/*
        Montado só quando aberto: assim o formulário nasce com os dados atuais
        da empresa a cada abertura, em vez de guardar o que foi carregado da
        primeira vez.
      */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar informações</DialogTitle>
            <DialogDescription>
              Dados cadastrais de {data.name}. A situação cadastral, o CNAE e o
              porte vêm da Receita Federal e não são editáveis aqui.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <CompanyForm company={data} onDone={() => setEditing(false)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
