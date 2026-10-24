import { Controller, Get, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import { verifyAssetToken } from '~/shared/helpers/signed_assets';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AssetNotFoundError, DomainErrorCodes, InvalidAssetTokenError } from '../../domain/errors';

@ApiTags('chat-module')
@Controller('chat')
export class ChatController {
  @Get('assets')
  @ApiOperation({ summary: 'Serves a project asset through a short-lived signed link' })
  @ApiResponse({ status: 200, description: 'The asset' })
  @ApiResponse({ status: 403, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'The asset does not exist' })
  serveAsset(@Res() res: Response, @Query('token') token: string): void {
    const check = verifyAssetToken(token);
    if (!check.ok) throw new InvalidAssetTokenError('Asset token refused', DomainErrorCodes.INVALID_ASSET_TOKEN_ERROR, { reason: check.reason });
    if (!existsSync(check.file)) throw new AssetNotFoundError('Asset not found', DomainErrorCodes.ASSET_NOT_FOUND_ERROR);
    const maxAge = Math.max(0, check.expiresAt - Math.floor(Date.now() / 1000));
    res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
    res.sendFile(check.file);
  }
}
