'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { updateCompanySchema } from '@/features/companies/schemas/company.schema';
import { useUpdateCompany } from '@/features/companies/hooks/use-update-company';
import { formatCNPJ } from '@/utils/format';
import type {
  Company,
  UpdateCompanyInput,
} from '@/features/companies/types/company.types';

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const STATUS_OPTIONS: readonly { value: Company['status']; label: string }[] = [
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
  { value: 'pending', label: 'Pendente' },
];

interface CompanyFormProps {
  readonly company: Company;
  /** Chamado depois de salvar, para o diálogo fechar. */
  readonly onDone: () => void;
}

export function CompanyForm({
  company,
  onDone,
}: CompanyFormProps): React.ReactNode {
  const { mutateAsync, isPending } = useUpdateCompany(company.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      name: company.name,
      tradeName: company.tradeName,
      status: company.status,
      email: company.email,
      phone: company.phone,
      logradouro: company.logradouro,
      numero: company.numero,
      complemento: company.complemento,
      bairro: company.bairro,
      cep: company.cep,
      city: company.city,
      state: company.state,
    },
  });

  async function onSubmit(values: UpdateCompanyInput): Promise<void> {
    try {
      await mutateAsync(values);
      toast.success('Dados da empresa atualizados.');
      onDone();
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Razão social" error={errors.name?.message}>
        <Input id="name" {...register('name')} />
      </Field>

      <Field label="Nome fantasia" error={errors.tradeName?.message}>
        <Input id="tradeName" {...register('tradeName')} />
      </Field>

      {/*
        O CNPJ aparece para quem edita se situar, mas não é editável: ele
        identifica a empresa e alimenta a auditoria e a consulta à Receita.
      */}
      <Field label="CNPJ" hint="não editável">
        <Input id="cnpj" value={formatCNPJ(company.cnpj)} disabled readOnly />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Situação" error={errors.status?.message}>
          <select id="status" {...register('status')} className={SELECT_CLASS}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Telefone" error={errors.phone?.message}>
          <Input id="phone" {...register('phone')} />
        </Field>
      </div>

      <Field label="E-mail" error={errors.email?.message}>
        <Input id="email" type="email" {...register('email')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field label="Logradouro" error={errors.logradouro?.message}>
            <Input id="logradouro" {...register('logradouro')} />
          </Field>
        </div>

        <Field label="Número" error={errors.numero?.message}>
          <Input id="numero" {...register('numero')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Complemento"
          error={errors.complemento?.message}
          hint="opcional"
        >
          <Input id="complemento" {...register('complemento')} />
        </Field>

        <Field label="Bairro" error={errors.bairro?.message}>
          <Input id="bairro" {...register('bairro')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="CEP" error={errors.cep?.message}>
          <Input id="cep" {...register('cep')} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Cidade" error={errors.city?.message}>
            <Input id="city" {...register('city')} />
          </Field>
        </div>

        <Field label="UF" error={errors.state?.message}>
          <Input id="state" maxLength={2} {...register('state')} />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly children: React.ReactElement<{ id?: string }>;
}): React.ReactNode {
  const id = children.props.id;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {hint ? (
          <span className="ml-2 text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
