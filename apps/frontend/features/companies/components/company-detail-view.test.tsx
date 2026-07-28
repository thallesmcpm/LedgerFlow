import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanyDetailView } from './company-detail-view';
import type { Company } from '@/features/companies/types/company.types';

const COMPANY: Company = {
  id: 'cmp_1',
  name: 'Padaria Pão Quente LTDA',
  tradeName: 'Pão Quente',
  cnpj: '12345678000190',
  status: 'active',
  situacaoCadastral: 'ATIVA',
  cnaeCodigo: '4721102',
  cnaeDescricao: 'Padaria e confeitaria com predominância de revenda',
  porte: 'ME',
  naturezaJuridica: 'Sociedade Empresária Limitada',
  dataAbertura: '2019-03-11T00:00:00.000Z',
  email: 'contato@paoquente.com.br',
  phone: '1133334444',
  logradouro: 'RUA DAS FLORES',
  numero: '120',
  complemento: null,
  bairro: 'CENTRO',
  cep: '01001000',
  city: 'São Paulo',
  state: 'SP',
  healthScore: 90,
  createdAt: '2026-01-01T00:00:00.000Z',
  partners: [],
};

vi.mock('@/features/companies/hooks/use-company', () => ({
  useCompany: () => ({ data: COMPANY, isLoading: false, isError: false }),
}));

vi.mock('@/features/companies/hooks/use-update-company', () => ({
  useUpdateCompany: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('CompanyDetailView', () => {
  it('oferece um botão para editar as informações da empresa', () => {
    render(<CompanyDetailView companyId="cmp_1" />);

    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
  });

  it('abre o formulário já preenchido ao clicar em editar', async () => {
    const user = userEvent.setup();
    render(<CompanyDetailView companyId="cmp_1" />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.getByLabelText(/raz[ãa]o social/i)).toHaveValue(
      'Padaria Pão Quente LTDA',
    );
  });

  it('não mostra o formulário antes do clique', () => {
    render(<CompanyDetailView companyId="cmp_1" />);

    expect(screen.queryByLabelText(/raz[ãa]o social/i)).not.toBeInTheDocument();
  });
});
