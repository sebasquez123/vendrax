import type { ArgumentsHost } from '@nestjs/common';
import { Catch } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { HttpExceptionFilter, isDomainError, isError, isHttpError } from '~/shared/filters/http-exception.filter';
import { ChatEvents, ChatStatus } from '../../modules/chat/domain/interfaces/gateway.interfaces';

@Catch()
export class WsExceptionFilter extends HttpExceptionFilter {
  override catch(exception: Error, host: ArgumentsHost) {
    super.catch(exception, host);
    if (host.getType() !== 'ws') return;
    const status = isDomainError(exception) ? exception.httpStatus : isHttpError(exception) ? exception.getStatus() : 500;
    const message = isError(exception) ? exception.message : String(exception);
    host.switchToWs().getClient<Socket>().emit(ChatEvents.ERROR, { message, statusCode: status, status: ChatStatus.END });
  }
}
