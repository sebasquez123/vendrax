import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { AdminService } from '~/modules/admin/application/admin.service';
import { API_KEY_HEADER } from '~/shared/services/crypto/crypto';
import { DomainErrorCodes as e, MiddlewareUnauthorizedError } from './errors';

/**
 * Middleware de API key para REST
 * Exige en 'x-api-key' una key vigente de un cliente activo; por ahora solo comprueba su autenticidad.
 */
@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly adminService: AdminService) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const apiKey = request.header(API_KEY_HEADER);
    if (!apiKey) throw new MiddlewareUnauthorizedError(`Missing '${API_KEY_HEADER}' header`, e.NO_API_KEY_ERROR);

    const client = await this.adminService.getClientByApiKey(apiKey);
    if (!client) throw new MiddlewareUnauthorizedError('Invalid API key', e.INVALID_API_KEY_ERROR);

    next();
  }
}
