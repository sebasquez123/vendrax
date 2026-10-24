import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { AdminService } from '../../application/admin.service';
import { DatabaseUnavailableError, DomainErrorCodes, InvalidAdminPayloadError } from '../../domain/errors';
import type { Guide } from '../../domain/templating/guides';
import { AgentFeedbackSchema } from '../../domain/validator';
import type { DatabaseHealthStatus, HealthStatus } from '../../domain/interfaces/health.interface';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import config from '~/config';
import { I18n, I18nContext } from 'nestjs-i18n';
import { createTranslator } from '~/shared/services/i18n/config';

@ApiTags('admin-module')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check: the server is up and answering' })
  @ApiResponse({ status: 200, description: 'Status, version, seconds since it started and the current time' })
  getHealth(): HealthStatus {
    return { status: 'ok', version: config.app.version, uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() };
  }

  @Get('health/database')
  @ApiOperation({ summary: 'Database health check: a SELECT 1 that must answer within 3 seconds' })
  @ApiResponse({ status: 200, description: 'The database answered: its latency and the current time' })
  @ApiResponse({ status: 503, description: 'The database did not answer or is not connected' })
  async getDatabaseHealth(): Promise<DatabaseHealthStatus> {
    const startedAt = Date.now();
    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timed out after 3000ms')), 3000).unref()),
      ]);
    } catch (error) {
      throw new DatabaseUnavailableError(
        `Database health check failed: ${error instanceof Error ? error.message : String(error)}`,
        DomainErrorCodes.DATABASE_UNAVAILABLE_ERROR
      );
    }
    return { status: 'ok', latencyMs: Date.now() - startedAt, timestamp: new Date().toISOString() };
  }

  @Get('guides/:reference')
  @ApiOperation({ summary: 'The short guide of a service, shown before a chat: how to ask and what to keep in mind' })
  @ApiParam({ name: 'reference', description: "The service: 'superset' or 'pay'", example: 'superset' })
  @ApiResponse({ status: 200, description: 'The guide: its sections, each with a title and its lines' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: "The guide's language ('es' or 'en'); Spanish when missing or not available",
    example: 'en',
  })
  @ApiResponse({ status: 404, description: 'There is no guide for that reference' })
  getGuide(@Param('reference') reference: string, @I18n() i18n: I18nContext): Guide {
    return this.adminService.getGuide(reference, createTranslator(i18n.service, i18n.lang));
  }

  @Post('feedback')
  @HttpCode(201)
  @ApiOperation({ summary: "Records a user's report about METBOT (what happened, their comment and the conversation)" })
  @ApiBody({
    description: 'appClientId (uuid), userId (the user id on the platform), type, comment (optional) and conversation (JSON, optional)',
    schema: {
      example: {
        appClientId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 123,
        type: 'respuesta incorrecta',
        comment: 'Creó el gráfico con otra métrica',
        conversation: [
          { usertype: 'user', message: 'Crea un gráfico de ventas por mes' },
          { usertype: 'assistant', message: 'Listo, creé el gráfico…' },
        ],
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Recorded: its id and when' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 404, description: 'The client or the user does not exist' })
  async recordFeedback(@Body() body: unknown): Promise<void> {
    const validated = AgentFeedbackSchema.safeParse(body);
    if (!validated.success)
      throw new InvalidAdminPayloadError('Feedback payload validation failure', DomainErrorCodes.INVALID_FEEDBACK_PAYLOAD_ERROR, {
        issues: formatZodErrorMessages(validated),
      });
    return this.adminService.recordFeedback(validated.data);
  }
}
