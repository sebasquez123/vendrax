import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientApiKey1763000000000 implements MigrationInterface {
  name = 'ClientApiKey1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ADMINISTRATIVE"."CLIENT" ADD "apiKeyHash" character varying(64)`);
    await queryRunner.query(`ALTER TABLE "ADMINISTRATIVE"."CLIENT" ADD "apiKeyRotatedAt" TIMESTAMP(3)`);
    await queryRunner.query(`ALTER TABLE "ADMINISTRATIVE"."CLIENT" ADD CONSTRAINT "UQ_client_api_key_hash" UNIQUE ("apiKeyHash")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ADMINISTRATIVE"."CLIENT" DROP CONSTRAINT IF EXISTS "UQ_client_api_key_hash"`);
    await queryRunner.query(`ALTER TABLE "ADMINISTRATIVE"."CLIENT" DROP COLUMN IF EXISTS "apiKeyRotatedAt"`);
    await queryRunner.query(`ALTER TABLE "ADMINISTRATIVE"."CLIENT" DROP COLUMN IF EXISTS "apiKeyHash"`);
  }
}
