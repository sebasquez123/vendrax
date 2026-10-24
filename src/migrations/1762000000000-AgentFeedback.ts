import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentFeedback1762000000000 implements MigrationInterface {
  name = 'AgentFeedback1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "AUDITORY"."AGENT_FEEDBACK" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "platformUserId" integer NOT NULL,
        "userName" character varying,
        "clientName" character varying NOT NULL,
        "type" character varying NOT NULL,
        "comment" text,
        "conversation" jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_feedback_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_agent_feedback_user" FOREIGN KEY ("userId") REFERENCES "ADMINISTRATIVE"."USER"("id"),
        CONSTRAINT "FK_agent_feedback_client" FOREIGN KEY ("clientId") REFERENCES "ADMINISTRATIVE"."CLIENT"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_agent_feedback_created_at" ON "AUDITORY"."AGENT_FEEDBACK" ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "AUDITORY"."AGENT_FEEDBACK"`);
  }
}
