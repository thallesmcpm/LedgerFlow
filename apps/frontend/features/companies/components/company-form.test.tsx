import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanyForm } from './company-form';
import type { Company } from '@/features/companies/types/company.types';

/**
 * O backend já expunha `PATCH /companies/:id`, mas o frontend nunca teve a
 * tela — o arquivo do formulário existia vazio. Estes testes descrevem o que
 * ela precisa fazer.
 */
const mutateAsync = vi.fn();

vi.mock('@/features/companies/hooks/use-update-company', () => ({
  useUpdateCompany: () => ({ mutateAsync, isPending: false }),
}));

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

describe('CompanyForm', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue(COMPANY);
  });

  it('vem preenchido com os dados atuais da empresa', () => {
    render(<CompanyForm company={COMPANY} onDone={vi.fn()} />);

    expect(screen.getByLabelText(/raz[ãa]o social/i)).toHaveValue(
      'Padaria Pão Quente LTDA',
    );
    expect(screen.getByLabelText(/cidade/i)).toHaveValue('São Paulo');
  });

  it('não deixa alterar o CNPJ, que identifica a empresa', () => {
    render(<CompanyForm company={COMPANY} onDone={vi.fn()} />);

    expect(screen.getByLabelText(/cnpj/i)).toBeDisabled();
  });

  it('envia apenas os campos editáveis ao salvar', async () => {
    const user = userEvent.setup();
    render(<CompanyForm company={COMPANY} onDone={vi.fn()} />);

    const phone = screen.getByLabelText(/telefone/i);
    await user.clear(phone);
    await user.type(phone, '1199998888');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const enviado = mutateAsync.mock.calls[0][0];
    expect(enviado.phone).toBe('1199998888');
    expect(enviado).not.toHaveProperty('cnpj');
  });

  it('avisa quem chamou quando termina, para o diálogo fechar', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<CompanyForm company={COMPANY} onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});
