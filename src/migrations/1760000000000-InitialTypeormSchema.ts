import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1760000000000 implements MigrationInterface {
  name = 'InitialMigration1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "ADMINISTRATIVE"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "AUDITORY"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "METBOT"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public`);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."CLIENT" (
        "id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "botName" character varying NOT NULL,
        "serverName" character varying NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        "deletedAt" TIMESTAMP(3),
        CONSTRAINT "PK_client_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."SERVER" (
        "id" uuid NOT NULL,
        "url" character varying NOT NULL,
        "transport" character varying NOT NULL,
        "serverName" character varying NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        "deletedAt" TIMESTAMP(3),
        CONSTRAINT "PK_server_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."USER" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" integer NOT NULL,
        "clientId" uuid NOT NULL,
        "username" character varying,
        "email" character varying,
        "avatar" character varying,
        "name" character varying,
        "status" boolean,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_user_id_client_id" UNIQUE ("userId", "clientId"),
        CONSTRAINT "FK_user_client" FOREIGN KEY ("clientId") REFERENCES "ADMINISTRATIVE"."CLIENT"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."CLIENT_SERVER" (
        "id" uuid NOT NULL,
        "serverId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        "deletedAt" TIMESTAMP(3),
        CONSTRAINT "PK_client_server_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_server_server_id_client_id" UNIQUE ("serverId", "clientId"),
        CONSTRAINT "FK_client_server_server" FOREIGN KEY ("serverId") REFERENCES "ADMINISTRATIVE"."SERVER"("id"),
        CONSTRAINT "FK_client_server_client" FOREIGN KEY ("clientId") REFERENCES "ADMINISTRATIVE"."CLIENT"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."SERVER_AUTH" (
        "id" uuid NOT NULL,
        "serverId" uuid NOT NULL,
        "serverType" character varying NOT NULL,
        "authType" character varying NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_server_auth_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_server_auth_server_id" UNIQUE ("serverId"),
        CONSTRAINT "FK_server_auth_server" FOREIGN KEY ("serverId") REFERENCES "ADMINISTRATIVE"."SERVER"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."JWT_API_AUTH" (
        "id" uuid NOT NULL,
        "serverAuthId" uuid NOT NULL,
        "schema" character varying NOT NULL,
        "authEndpoint" character varying NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_jwt_api_auth_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_jwt_api_auth_server_auth_id" UNIQUE ("serverAuthId"),
        CONSTRAINT "FK_jwt_api_auth_server_auth" FOREIGN KEY ("serverAuthId") REFERENCES "ADMINISTRATIVE"."SERVER_AUTH"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."JWT_MCP_AUTH" (
        "id" uuid NOT NULL,
        "serverAuthId" uuid NOT NULL,
        "schema" character varying NOT NULL,
        "mcpEndpoint" character varying NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_jwt_mcp_auth_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_jwt_mcp_auth_server_auth_id" UNIQUE ("serverAuthId"),
        CONSTRAINT "FK_jwt_mcp_auth_server_auth" FOREIGN KEY ("serverAuthId") REFERENCES "ADMINISTRATIVE"."SERVER_AUTH"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."OAUTH_API_AUTH" (
        "id" uuid NOT NULL,
        "serverAuthId" uuid NOT NULL,
        "schema" character varying NOT NULL,
        "client" character varying NOT NULL,
        "authEndpoint" character varying NOT NULL,
        "refreshEndpoint" character varying NOT NULL,
        "redirectUrl" character varying NOT NULL,
        "clientSecret" character varying NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_oauth_api_auth_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oauth_api_auth_server_auth_id" UNIQUE ("serverAuthId"),
        CONSTRAINT "FK_oauth_api_auth_server_auth" FOREIGN KEY ("serverAuthId") REFERENCES "ADMINISTRATIVE"."SERVER_AUTH"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."OAUTH_MCP_AUTH" (
        "id" uuid NOT NULL,
        "serverAuthId" uuid NOT NULL,
        "schema" character varying NOT NULL,
        "mcpEndpoint" character varying NOT NULL,
        "authEndpoint" character varying NOT NULL,
        "refreshEndpoint" character varying NOT NULL,
        "username" character varying NOT NULL,
        "password" character varying NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_oauth_mcp_auth_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oauth_mcp_auth_server_auth_id" UNIQUE ("serverAuthId"),
        CONSTRAINT "FK_oauth_mcp_auth_server_auth" FOREIGN KEY ("serverAuthId") REFERENCES "ADMINISTRATIVE"."SERVER_AUTH"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."OAUTH" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clientServerId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "refreshToken" character varying NOT NULL,
        "accessToken" character varying NOT NULL,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_oauth_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_oauth_client_server" FOREIGN KEY ("clientServerId") REFERENCES "ADMINISTRATIVE"."CLIENT_SERVER"("id"),
        CONSTRAINT "FK_oauth_user" FOREIGN KEY ("userId") REFERENCES "ADMINISTRATIVE"."USER"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."OAUTH"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."OAUTH_MCP_AUTH"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."OAUTH_API_AUTH"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."JWT_MCP_AUTH"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."JWT_API_AUTH"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."SERVER_AUTH"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."CLIENT_SERVER"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."USER"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."SERVER"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."CLIENT"`);

    await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "ADMINISTRATIVE"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "AUDITORY"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "METBOT"`);
  }
}
