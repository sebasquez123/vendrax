import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';

import { AuthPortInterface, GetUserProfileParams, GetUserProfileResponse } from '../application/interfaces/port.interface';
import { AuthAdapterBadGatewayError, AuthPayloadError, DomainErrorCodes as e } from '../domain/errors';
import { IPayUser } from '../domain/interfaces/pay.interfaces';
@Injectable()
export class PayAuthAdapterService implements AuthPortInterface {
  private logger = new LoggerService(PayAuthAdapterService.name);
  constructor() {}

  public async checkHealth(baseUrl: string): Promise<boolean> {
    this.logger.trace(`Checking Pay Adapter health...`);
    try {
      const livenessCheck = await fetch(`${baseUrl}/health/live`, {
        method: 'GET',
      });
      if (!livenessCheck.ok) return false;

      const healthCheck = await fetch(`${baseUrl}/health/check`, {
        method: 'GET',
      });
      if (!healthCheck.ok) return false;

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Uncaught error for Health check';
      this.logger.error(`Unexpected error from PAY adapter: ${errorMessage}`);
      return false;
    }
  }

  public async getUserProfile({ token, baseUrl }: GetUserProfileParams): Promise<GetUserProfileResponse> {
    this.logger.trace(`Getting user profile from Pay Adapter...`);
    const payload = token.split('.')[1];

    if (!payload) throw new AuthPayloadError(`Error getting Pay's token payload`, e.TOKEN_PAYLOAD_ERROR);
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));

    const response = await fetch(`${baseUrl}/user/current`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...decoded,
      }),
    });

    const responseText = await response.text();
    if (!response.ok) throw new AuthAdapterBadGatewayError(`Error getting PAY User profile: ${responseText}`, e.GET_USER_PROFILE_ERROR);
    const result = JSON.parse(responseText) as IPayUser;
    const profile: GetUserProfileResponse = {
      id: result.data.ID,
      name: result.data.NAME,
      userName: result.data.USERNAME,
      email: result.data.CONTACT_EMAIL,
      birthDate: result.data.DATE_OF_BIRTH,
      status: !!result.data.IS_ACTIVE,
    };
    return profile;
  }
}
