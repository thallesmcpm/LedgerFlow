import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  seedTenants,
  companyFactory,
  brasilApiMock,
  TestContext,
  TENANT_A,
  TENANT_B,
} from './test-utils';

describe('Audit (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    await seedTenants(ctx.prisma);
    brasilApiMock.reset();
  });

  const http = () => request(ctx.app.getHttpServer());

  describe('POST /api/audit/companies/:companyId', () => {
    it('runs an audit, returns findings and updates the company healthScore', async () => {
      const company = await ctx.prisma.company.create({
        data: {
          ...companyFactory(TENANT_A, { cnpj: '11222333000181', healthScore: 50 }),
          situacaoCadastral: 'ATIVA',
          cnaeCodigo: '4721102',
          porte: 'ME',
        },
      });

      const response = await http()
        .post(`/api/audit/companies/${company.id}`)
        .expect(201);

      expect(response.body.data.score).toBe(100);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.findings).toHaveLength(6);

      const reloaded = await ctx.prisma.company.findUnique({
        where: { id: company.id },
      });
      expect(reloaded?.healthScore).toBe(100);

      const logs = await ctx.prisma.activityLog.findMany({
        where: { action: 'audit.completed' },
      });
      expect(logs).toHaveLength(1);
    });

    it('returns 404 when auditing a company from another tenant', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '22222222000122' }),
      });

      await http().post(`/api/audit/companies/${other.id}`).expect(404);
    });
  });

  describe('GET /api/audit', () => {
    it('lists the tenant audit runs in the paginated envelope', async () => {
      const company = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '33333333000133' }),
      });
      await http().post(`/api/audit/companies/${company.id}`).expect(201);
      await http().post(`/api/audit/companies/${company.id}`).expect(201);

      const response = await http().get('/api/audit').expect(200);

      expect(response.body.pagination.total).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        companyId: company.id,
        score: expect.any(Number),
        findingsCount: 6,
      });
    });

    it('traz o nome da empresa, não só o id, para a tela não exibir o cuid', async () => {
      const company = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, {
          cnpj: '55555555000155',
          name: 'Padaria Central LTDA',
        }),
      });
      await http().post(`/api/audit/companies/${company.id}`).expect(201);

      const response = await http().get('/api/audit').expect(200);

      expect(response.body.data[0].companyName).toBe('Padaria Central LTDA');
    });

    it('never lists audit runs from another tenant', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '44444444000144' }),
      });
      await ctx.prisma.auditRun.create({
        data: {
          tenantId: TENANT_B,
          companyId: other.id,
          score: 80,
          status: 'healthy',
        },
      });

      const response = await http().get('/api/audit').expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/audit/:id', () => {
    it('returns an audit run with its findings', async () => {
      const company = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '55555555000155' }),
      });
      const created = await http()
        .post(`/api/audit/companies/${company.id}`)
        .expect(201);
      const runId = created.body.data.id;

      const response = await http().get(`/api/audit/${runId}`).expect(200);

      expect(response.body.data.id).toBe(runId);
      expect(response.body.data.findings).toHaveLength(6);
      expect(response.body.data.findings[0]).toEqual(
        expect.objectContaining({
          code: expect.any(String),
          severity: expect.any(String),
          message: expect.any(String),
          result: expect.stringMatching(/^(passed|failed|skipped)$/),
        }),
      );
    });

    it('returns 404 for a run from another tenant', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '66666666000166' }),
      });
      const run = await ctx.prisma.auditRun.create({
        data: {
          tenantId: TENANT_B,
          companyId: other.id,
          score: 80,
          status: 'healthy',
        },
      });

      await http().get(`/api/audit/${run.id}`).expect(404);
    });
  });

  describe('GET /api/audit/latest', () => {
    it('devolve null quando o escritório nunca auditou', async () => {
      const response = await http().get('/api/audit/latest').expect(200);

      expect(response.body.data).toBeNull();
    });

    it('devolve a execução mais recente de cada empresa, não todas', async () => {
      const company = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '66666666000166' }),
      });
      await http().post(`/api/audit/companies/${company.id}`).expect(201);
      await http().post(`/api/audit/companies/${company.id}`).expect(201);

      const response = await http().get('/api/audit/latest').expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.runs).toHaveLength(1);
    });

    it('lista as críticas antes das saudáveis', async () => {
      const boa = await ctx.prisma.company.create({
        data: {
          ...companyFactory(TENANT_A, {
            cnpj: '11222333000181',
            name: 'Empresa Regular',
          }),
          situacaoCadastral: 'ATIVA',
          cnaeCodigo: '4721102',
          porte: 'ME',
        },
      });
      // CNPJ com dígito verificador inválido: falha crítica garantida.
      const ruim = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, {
          cnpj: '32165498000177',
          name: 'Empresa Com Problema',
        }),
      });
      await http().post(`/api/audit/companies/${boa.id}`).expect(201);
      await http().post(`/api/audit/companies/${ruim.id}`).expect(201);

      const response = await http().get('/api/audit/latest').expect(200);

      expect(response.body.data.runs[0].companyName).toBe(
        'Empresa Com Problema',
      );
    });

    it('não enxerga auditorias de outro tenant', async () => {
      const outra = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '77777777000177' }),
      });
      await ctx.prisma.auditRun.create({
        data: {
          tenantId: TENANT_B,
          companyId: outra.id,
          score: 10,
          status: 'critical',
        },
      });

      const response = await http().get('/api/audit/latest').expect(200);

      expect(response.body.data).toBeNull();
    });
  });

  describe('POST /api/audit/run', () => {
    it('audita a carteira inteira e resume por status', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: {
          cnpj: '33000167000101',
          razao_social: 'EMPRESA CERTA LTDA',
          descricao_situacao_cadastral: 'ATIVA',
          logradouro: 'RUA A',
          numero: '1',
          bairro: 'CENTRO',
          cep: '01001000',
          municipio: 'SAO PAULO',
          uf: 'SP',
        },
      };

      await ctx.prisma.company.create({
        data: {
          ...companyFactory(TENANT_A, {
            cnpj: '33000167000101',
            name: 'EMPRESA CERTA LTDA',
          }),
          situacaoCadastral: 'ATIVA',
          cnaeCodigo: '4721102',
          porte: 'ME',
          logradouro: 'RUA A',
          numero: '1',
          bairro: 'CENTRO',
          cep: '01001000',
          city: 'SAO PAULO',
          state: 'SP',
        },
      });

      const response = await http().post('/api/audit/run').expect(201);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.runs).toHaveLength(1);
      expect(response.body.data.runs[0].score).toBe(100);
      expect(response.body.data.healthy).toBe(1);
      expect(response.body.data.attention).toBe(0);
      expect(response.body.data.critical).toBe(0);

      const reloaded = await ctx.prisma.company.findFirst({
        where: { tenantId: TENANT_A, cnpj: '33000167000101' },
      });
      expect(reloaded?.healthScore).toBe(100);
    });

    it('devolve total zero e não audita empresas de outro tenant', async () => {
      await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '47960950000121' }),
      });

      const response = await http().post('/api/audit/run').expect(201);

      expect(response.body.data.total).toBe(0);
      expect(response.body.data.runs).toHaveLength(0);

      const runsForTenantB = await ctx.prisma.auditRun.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(runsForTenantB).toHaveLength(0);
    });

    it('marca regras da BrasilAPI como skipped quando ela está fora, sem derrubar a auditoria', async () => {
      brasilApiMock.fail = true;
      // CNPJ inédito neste arquivo: o cache in-memory da BrasilAPI é
      // reaproveitado entre testes (mesma instância de app), então reusar um
      // CNPJ já consultado com sucesso mascararia a falha simulada aqui.
      await ctx.prisma.company.create({
        data: {
          ...companyFactory(TENANT_A, { cnpj: '71673990000177' }),
          situacaoCadastral: 'ATIVA',
          cnaeCodigo: '4721102',
          porte: 'ME',
        },
      });

      const response = await http().post('/api/audit/run').expect(201);
      const detail = await http()
        .get(`/api/audit/${response.body.data.runs[0].id}`)
        .expect(200);

      const skipped = detail.body.data.findings.filter(
        (f: { result: string }) => f.result === 'skipped',
      );
      expect(skipped).toHaveLength(2);
      expect(
        skipped.every((f: { detail: string | null }) => f.detail !== null),
      ).toBe(true);
      // Regras que não dependem da BrasilAPI continuam avaliadas normalmente.
      expect(response.body.data.runs[0].score).toBe(100);
      expect(response.body.data.healthy).toBe(1);
    });

    it('detecta empresas duplicadas comparando a carteira inteira', async () => {
      await ctx.prisma.company.createMany({
        data: [
          companyFactory(TENANT_A, {
            cnpj: '11222333000181',
            name: 'Transportes Rápido EIRELI',
          }),
          companyFactory(TENANT_A, {
            cnpj: '07526557000100',
            name: 'Transportes Rápido EIRELI',
          }),
        ],
      });

      const response = await http().post('/api/audit/run').expect(201);

      expect(response.body.data.total).toBe(2);
      for (const run of response.body.data.runs) {
        const detail = await http().get(`/api/audit/${run.id}`).expect(200);
        const duplicada = detail.body.data.findings.find(
          (f: { code: string }) => f.code === 'empresa_duplicada',
        );
        expect(duplicada.result).toBe('failed');
      }
    });
  });
});
