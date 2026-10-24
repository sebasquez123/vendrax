import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PermissionTables1761000000000 implements MigrationInterface {
  name = 'PermissionTables1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "METBOT"."TOOL" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "serverId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "type" character varying NOT NULL,
        "description" character varying,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_tool_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tool_server_id_name" UNIQUE ("serverId", "name"),
        CONSTRAINT "CHK_tool_type" CHECK ("type" IN ('create', 'read', 'update', 'delete')),
        CONSTRAINT "FK_tool_server" FOREIGN KEY ("serverId") REFERENCES "ADMINISTRATIVE"."SERVER"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "METBOT"."SUBDOMAIN" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "serverId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_subdomain_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subdomain_server_id_name" UNIQUE ("serverId", "name"),
        CONSTRAINT "FK_subdomain_server" FOREIGN KEY ("serverId") REFERENCES "ADMINISTRATIVE"."SERVER"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "METBOT"."MODE" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subdomainId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_mode_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mode_subdomain_id_name" UNIQUE ("subdomainId", "name"),
        CONSTRAINT "FK_mode_subdomain" FOREIGN KEY ("subdomainId") REFERENCES "METBOT"."SUBDOMAIN"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."CLIENT_TOOL_PERMISSION" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clientServerId" uuid NOT NULL,
        "toolId" uuid NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_client_tool_permission_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_tool_permission_client_server_id_tool_id" UNIQUE ("clientServerId", "toolId"),
        CONSTRAINT "FK_client_tool_permission_client_server" FOREIGN KEY ("clientServerId") REFERENCES "ADMINISTRATIVE"."CLIENT_SERVER"("id"),
        CONSTRAINT "FK_client_tool_permission_tool" FOREIGN KEY ("toolId") REFERENCES "METBOT"."TOOL"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."CLIENT_SUBDOMAIN_PERMISSION" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clientServerId" uuid NOT NULL,
        "subdomainId" uuid NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_client_subdomain_permission_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_subdomain_permission_client_server_id_subdomain_id" UNIQUE ("clientServerId", "subdomainId"),
        CONSTRAINT "FK_client_subdomain_permission_client_server" FOREIGN KEY ("clientServerId") REFERENCES "ADMINISTRATIVE"."CLIENT_SERVER"("id"),
        CONSTRAINT "FK_client_subdomain_permission_subdomain" FOREIGN KEY ("subdomainId") REFERENCES "METBOT"."SUBDOMAIN"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."CLIENT_MODE_PERMISSION" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subdomainPermissionId" uuid NOT NULL,
        "modeId" uuid NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_client_mode_permission_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_mode_permission_subdomain_permission_id_mode_id" UNIQUE ("subdomainPermissionId", "modeId"),
        CONSTRAINT "FK_client_mode_permission_subdomain_permission" FOREIGN KEY ("subdomainPermissionId") REFERENCES "ADMINISTRATIVE"."CLIENT_SUBDOMAIN_PERMISSION"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_client_mode_permission_mode" FOREIGN KEY ("modeId") REFERENCES "METBOT"."MODE"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."USER_TOOL_PERMISSION" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "toolId" uuid NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_user_tool_permission_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_tool_permission_user_id_tool_id" UNIQUE ("userId", "toolId"),
        CONSTRAINT "FK_user_tool_permission_user" FOREIGN KEY ("userId") REFERENCES "ADMINISTRATIVE"."USER"("id"),
        CONSTRAINT "FK_user_tool_permission_tool" FOREIGN KEY ("toolId") REFERENCES "METBOT"."TOOL"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ADMINISTRATIVE"."USER_SERVER_PERMISSION" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "clientServerId" uuid NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP(3),
        CONSTRAINT "PK_user_server_permission_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_server_permission_user_id_client_server_id" UNIQUE ("userId", "clientServerId"),
        CONSTRAINT "FK_user_server_permission_user" FOREIGN KEY ("userId") REFERENCES "ADMINISTRATIVE"."USER"("id"),
        CONSTRAINT "FK_user_server_permission_client_server" FOREIGN KEY ("clientServerId") REFERENCES "ADMINISTRATIVE"."CLIENT_SERVER"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."USER_SERVER_PERMISSION"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."USER_TOOL_PERMISSION"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."CLIENT_MODE_PERMISSION"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."CLIENT_SUBDOMAIN_PERMISSION"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ADMINISTRATIVE"."CLIENT_TOOL_PERMISSION"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "METBOT"."MODE"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "METBOT"."SUBDOMAIN"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "METBOT"."TOOL"`);
  }
}
