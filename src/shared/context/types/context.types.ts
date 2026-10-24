import { ServerEntity } from '~/entities';
import {
  IServerScopeTool,
  JwtApiToolType,
  OauthApiToolType,
  JwtMcpToolType,
  OauthMcpToolType,
} from '~/modules/admin/domain/interfaces/authorization.interface';
import { LanguageTranslator } from '~/shared/services/i18n/config';
export interface HttpContext {
  route?: string;
  traceId: string;
  startTime: [number, number];
  userId?: number;
  userName?: string;
  userEmail?: string;
  httpRequest: {
    remoteIp: string;
    referer: string | undefined;
    domain?: string;
    headers: Record<string, any>;
  };
}
export interface SocketContext {
  socket?: string;
  traceId: string;
  user: {
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    birthDate: string | null;
    utc: string | null;
    language: string | null;
  };
  client: {
    appClientId: string | null;
    scopes: string | null;
    botName: string | null;
  };
  connection: ConnectionContext[] | null;
  i18n: LanguageTranslator | null;
}

export interface ConnectionContext {
  server: ServerEntity;
  tools: IServerScopeTool[];
  subdomains: string[];
  modes: string[];
  authSchema: JwtMcpToolType | JwtApiToolType | OauthApiToolType | OauthMcpToolType;
}
