import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isValidCnpj } from '../common/cnpj';
import { ActivityService } from '../activity/activity.service';
import { BrasilApiService } from '../brasil-api/brasil-api.service';
import type { CnpjInfo, PartnerInfo } from '../brasil-api/brasil-api.types';
import { paginated, type Paginated } from '../common/pagination';
import { buildCompanyWhere } from './company-filters';
import {
  toCompanyDto,
  type CompanyDto,
  type CompanyWithPartners,
  type CreateCompanyInput,
  type ListCompaniesQuery,
  type UpdateCompanyInput,
} from './company.schema';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * Traduz a resposta oficial da BrasilAPI para colunas da tabela.
 * `status` (interno) e `healthScore` continuam derivados da situação
 * cadastral oficial na criação — o usuário pode sobrescrever depois via
 * PATCH. Os demais campos (CNAE, porte, endereço...) são só o espelho dos
 * dados oficiais.
 */
function fromCnpjInfo(
  info: CnpjInfo,
): Partial<Prisma.CompanyUncheckedCreateInput> {
  const active = info.situacao.trim().toUpperCase() === 'ATIVA';
  return {
    status: active ? 'active' : 'inactive',
    healthScore: active ? 90 : 40,
    situacaoCadastral: info.situacao,
    cnaeCodigo: info.cnaeCodigo,
    cnaeDescricao: info.cnaeDescricao,
    porte: info.porte,
    naturezaJuridica: info.naturezaJuridica,
    dataAbertura: info.dataAbertura ? new Date(info.dataAbertura) : null,
    logradouro: info.logradouro,
    numero: info.numero,
    complemento: info.complemento,
    bairro: info.bairro,
    cep: info.cep,
  };
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly brasilApi: BrasilApiService,
  ) {}

  /**
   * Consulta de CNPJ para o frontend pré-preencher o formulário.
   *
   * Valida os dígitos verificadores **antes** de sair para a rede: sem isso o
   * endpoint vira um proxy aberto para a BrasilAPI, e qualquer um poderia
   * varrer CNPJs através da nossa API — queimando o nosso rate limit no
   * fornecedor. CNPJ malformado nem chega a gerar requisição.
   */
  lookupCnpj(cnpj: string): Promise<CnpjInfo | null> {
    if (!isValidCnpj(cnpj)) {
      throw new BadRequestException('CNPJ inválido');
    }
    return this.brasilApi.lookupCnpj(cnpj);
  }

  async list(
    tenantId: string,
    query: ListCompaniesQuery,
  ): Promise<Paginated<CompanyDto>> {
    const { page, pageSize } = query;

    const where = buildCompanyWhere(tenantId, query);

    // Leituras paralelas (sem $transaction): evita lock de escrita do SQLite
    // sob concorrência — melhora drasticamente a cauda de latência (p99).
    const [total, rows] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return paginated(rows.map(toCompanyDto), page, pageSize, total);
  }

  async getById(tenantId: string, id: string): Promise<CompanyDto> {
    return toCompanyDto(await this.ensureOwned(tenantId, id));
  }

  async create(
    tenantId: string,
    actorId: string,
    input: CreateCompanyInput,
  ): Promise<CompanyDto> {
    const data: Prisma.CompanyUncheckedCreateInput = { ...input, tenantId };
    let socios: readonly PartnerInfo[] = [];
    let enrichedFrom: string | undefined;

    // Enriquecimento resiliente: consulta SEMPRE a BrasilAPI ao cadastrar,
    // para preencher os campos oficiais (CNAE, porte, endereço, situação e
    // quadro societário) a partir do CNPJ informado. Falha/timeout da
    // BrasilAPI nunca bloqueia o cadastro — os campos oficiais simplesmente
    // ficam vazios e o usuário completa manualmente depois.
    const info = await this.brasilApi.lookupCnpj(input.cnpj);
    if (info) {
      Object.assign(data, fromCnpjInfo(info));
      socios = info.socios;
      enrichedFrom = info.situacao;
    }

    try {
      const company = await this.prisma.company.create({
        data: {
          ...data,
          partners: socios.length
            ? {
                create: socios.map((s) => ({
                  nome: s.nome,
                  qualificacao: s.qualificacao,
                  faixaEtaria: s.faixaEtaria,
                })),
              }
            : undefined,
        },
        include: { partners: true },
      });

      await this.activity.record({
        tenantId,
        actorId,
        action: 'company.created',
        entityType: 'company',
        entityId: company.id,
        metadata: enrichedFrom
          ? { enrichedFrom: 'brasilapi', situacao: enrichedFrom }
          : undefined,
      });
      return toCompanyDto(company);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyDto> {
    await this.ensureOwned(tenantId, id);
    try {
      const company = await this.prisma.company.update({
        where: { id },
        data: input,
        include: { partners: true },
      });
      await this.activity.record({
        tenantId,
        actorId,
        action: 'company.updated',
        entityType: 'company',
        entityId: id,
        metadata: { ...input },
      });
      return toCompanyDto(company);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }
      throw error;
    }
  }

  async remove(
    tenantId: string,
    actorId: string,
    id: string,
  ): Promise<CompanyDto> {
    const company = await this.ensureOwned(tenantId, id);
    await this.prisma.company.delete({ where: { id } });
    await this.activity.record({
      tenantId,
      actorId,
      action: 'company.deleted',
      entityType: 'company',
      entityId: id,
    });
    return toCompanyDto(company);
  }

  /** Garante que a empresa existe E pertence ao tenant do contexto. */
  private async ensureOwned(
    tenantId: string,
    id: string,
  ): Promise<CompanyWithPartners> {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
      include: { partners: true },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }
}
