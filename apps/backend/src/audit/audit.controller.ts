import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuditService } from './audit.service';
import {
  listAuditQuerySchema,
  type AuditRunDetailDto,
  type AuditRunSummaryDto,
  type ListAuditQuery,
  type PortfolioAuditDto,
} from './audit.types';
import type { Paginated } from '../common/pagination';

@Controller('audit')
@UseGuards(TenantContextGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(listAuditQuerySchema))
    query: ListAuditQuery,
  ): Promise<Paginated<AuditRunSummaryDto>> {
    return this.audit.list(tenantId, query);
  }

  @Post('run')
  runPortfolio(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthContext,
  ): Promise<PortfolioAuditDto> {
    return this.audit.runForPortfolio(tenantId, user.userId);
  }

  /**
   * Rota literal ANTES de `:id` — na ordem inversa, `@Get(':id')` capturaria
   * "latest" e a busca terminaria em 404.
   */
  @Get('latest')
  latest(@TenantId() tenantId: string): Promise<PortfolioAuditDto | null> {
    return this.audit.getLatestPortfolio(tenantId);
  }

  @Get(':id')
  getById(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<AuditRunDetailDto> {
    return this.audit.getById(tenantId, id);
  }

  @Post('companies/:companyId')
  run(
    @CurrentUser() auth: AuthContext,
    @Param('companyId') companyId: string,
  ): Promise<AuditRunDetailDto> {
    return this.audit.runForCompany(auth.tenantId, auth.userId, companyId);
  }
}
