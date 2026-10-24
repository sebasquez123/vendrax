import z from 'zod';
import { ToolType } from '~/entities';

export enum authValidatorSchemes {
  OauthMcpToolValidator = 'OauthMcpToolValidator',
  OauthApiToolValidator = 'OauthApiToolValidator',
  JwtApiToolValidator = 'JwtApiToolValidator',
  JwtMcpToolValidator = 'JwtMcpToolValidator',
}

export const OauthMcpToolValidator = z.object({
  headers: z.object({}),
  body: z.object({
    serverName: z.string(),
  }),
});

export type OauthMcpToolType = z.infer<typeof OauthMcpToolValidator>;

export const JwtMcpToolValidator = z.object({
  headers: z.object({
    Authorization: z.string(),
  }),
  body: z.object({
    serverName: z.string(),
  }),
});

export type JwtMcpToolType = z.infer<typeof JwtMcpToolValidator>;

export const OauthApiToolValidator = z.object({
  headers: z.object({}),
  body: z.object({
    serverName: z.string(),
    userId: z.string(),
    clientId: z.string(),
    serverId: z.string(),
    baseUrl: z.string(),
    client: z.string(),
    refreshEndpoint: z.string(),
    secret: z.string(),
    redirectUrl: z.string(),
  }),
});
export type OauthApiToolType = z.infer<typeof OauthApiToolValidator>;

export const JwtApiToolValidator = z.object({
  headers: z.object({
    token: z.string(),
  }),
  body: z.object({
    baseUrl: z.string(),
    serverName: z.string(),
  }),
});

export type JwtApiToolType = z.infer<typeof JwtApiToolValidator>;

export interface IServerAuthSchema {
  name: string;
  schema: string;
}
export interface IServerScopeTool {
  name: string;
}

export interface IUserServerPermission {
  name: string;
  scopes: {
    name: string;
    type: ToolType;
  }[];
}

export interface IClientServerPermission {
  name: string;
  scopes: IServerScopeTool[];
  subdomains: { name: string; modes: string[] }[];
}
