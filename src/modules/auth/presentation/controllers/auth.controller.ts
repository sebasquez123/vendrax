import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { renderSuccessView } from '../templates/authcallback.view';
import { AuthOrchestratorService } from '../../application/auth_orchestrator.service';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import { AuthPayloadError, DomainErrorCodes } from '../../domain/errors';
import express from 'express';

@ApiTags('auth-module')
@Controller('auth')
export class AuthController {
  constructor(private readonly authOrchestratorService: AuthOrchestratorService) {}

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Renders SSR iframe bubble for embedded chat' })
  @ApiResponse({ status: 201, description: 'Chat view served' })
  async callback(@Res() res: express.Response, @Query('code') code: string, @Query('state') state: string): Promise<void> {
    const stateArray = state.split('.');
    const clientId = stateArray[2];
    const serverId = stateArray[1];
    const userId = stateArray[0];
    if (!serverId || !userId || !clientId) throw new AuthPayloadError('Invalid Controller payload data', DomainErrorCodes.PAYLOAD_ERROR);
    const server = await this.authOrchestratorService.verifyServer(serverId);
    const serverName = server.serverName as ServerAdapters;

    await this.authOrchestratorService.upsertOauth({ code, userId, clientId, server }, serverName);
    res.type('html').send(renderSuccessView());
  }
}
