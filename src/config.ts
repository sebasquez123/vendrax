import { readFileSync } from 'node:fs';
import path from 'node:path';

import { config, parse } from 'dotenv';
import type { Level } from 'pino';
import { PreconditionFailedException } from '@nestjs/common';

config({ path: path.join(__dirname, '..', '.env') });

const missedEnvironmentVariables = Object.keys(parse(readFileSync(path.join(__dirname, '..', '.env.example')))).filter(
  (exampleKey) => !process.env[exampleKey]
);
if (missedEnvironmentVariables.length > 0) throw new PreconditionFailedException(`${missedEnvironmentVariables.join(', ')} not configured`);

export default {
  app: {
    name: 'met_mcp_workshop',
    port: Number.parseInt(process.env['PORT'] ?? '8080', 10),
    version: process.env['APP_VERSION']!,
    url: process.env['APP_URL'] ?? 'http://localhost/',
    encryptionKey: process.env['CREDS_KEY'] ?? '',
  },
  dbConfig: {
    type: 'postgres' as const,
    url: process.env['DATABASE_URL']!,
    schema: 'MIGRATIONS',
    entities: [path.join(__dirname, 'entities', '**', '*.{entity.js,entity.ts}')],
    migrations: [path.join(__dirname, 'migrations', '*.{js,ts}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    maxQueryExecutionTime: 1000,
  },
  log: {
    level: process.env['LOG_LEVEL']! as Level,
    colorize: Boolean(process.stdout.isTTY),
    file: process.env['LOG_FILE'] ?? '',
    fileSize: process.env['LOG_FILE_SIZE'] ?? '50m',
    fileLimit: Number(process.env['LOG_FILE_LIMIT'] ?? 20),
    isProduction: process.env['NODE_ENV'] === 'production',
  },
  llm: {
    gemini: {
      apikey: process.env['GEMINI_API_KEY']!,
      enable: process.env['GEMINI_API_KEY_ENABLE']! === 'true',
      model: process.env['GEMINI_MODEL']!,
      thinkingLevel: (process.env['GEMINI_THINKING_LEVEL'] ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
      maxOutputTokens: Number(process.env['GEMINI_MAX_OUTPUT_TOKENS'] ?? 4096),
      geminiThinking: process.env['GEMINI_THINKING'] === 'true' ? true : false,
      summaryModel: process.env['GEMINI_SUMMARY_MODEL'] || process.env['GEMINI_MODEL']!,
    },
    openai: {
      apikey: process.env['OPENAI_API_KEY']!,
      enable: process.env['OPENAI_API_KEY_ENABLE']! === 'true',
      model: process.env['OPENAI_MODEL']!,
      reasoningEffort: (process.env['OPENAI_REASONING_EFFORT'] ?? 'medium') as 'minimal' | 'low' | 'medium' | 'high',
      maxOutputTokens: Number(process.env['OPENAI_MAX_OUTPUT_TOKENS'] ?? 8192),
      openaiThinking: process.env['OPENAI_THINKING'] === 'true' ? true : false,
      summaryModel: process.env['OPENAI_SUMMARY_MODEL'] || process.env['OPENAI_MODEL']!,
    },
  },
  summary: {
    agent: process.env['SUMMARY_AGENT'] ?? 'gemini',
    triggerMessages: Number(process.env['SUMMARY_TRIGGER_MESSAGES'] ?? 20),
    remainingMessages: Number(process.env['SUMMARY_REMAINING_MESSAGES'] ?? 6),
    maxWords: Number(process.env['SUMMARY_MAX_WORDS'] ?? 300),
  },
  langsmith: {
    tracing: process.env['LANGSMITH_TRACING']!,
    endpoint: process.env['LANGSMITH_ENDPOINT']!,
    apikey: process.env['LANGSMITH_API_KEY']!,
    project: process.env['LANGSMITH_PROJECT']!,
  },
  assets: {
    signingSecret: process.env['ASSETS_SIGNING_SECRET'] ?? '',
  },
  tools: {
    toolTimeoutMs: Number(process.env['TOOL_TIME_OUT_MS'] ?? 50_000),
    toolFailureLimit: Number(process.env['TOOL_FAILURE_LIMIT'] ?? 2),
    toolCallLimit: Number(process.env['TOOL_CALL_LIMIT'] ?? 8),
    agentCallLimit: Number(process.env['AGENT_CALL_LIMIT'] ?? 12),
    agentRecursionLimit: Number(process.env['AGENT_RECURSION_LIMIT'] ?? 80),
  },
  rag: {
    url: process.env['RAG_API_URL'] ?? '',
    token: process.env['RAG_API_KEY'] ?? '',
    ragTimeoutMs: Number(process.env['RAG_TIME_OUT_MS'] ?? 15_000),
    top_k: Number(process.env['TOP_K'] ?? 5),
    min_score: Number(process.env['MIN_SCORE'] ?? 0.6),
    mode: process.env['MODE'] ?? 'hybrid',
    order_by: process.env['ORDER_BY'] ?? 'score',
    knowledgeSearchLimit: Number(process.env['KNOWLEDGE_SEARCH_LIMIT'] ?? 2),
  },
  preload: {
    catalogCacheValidTimeLimit: Number(process.env['CATALOG_CACHE_VALID_TIME_LIMIT'] ?? 60_000 * 15),
    defaultPreloadedExcerpts: Number(process.env['DEFAULT_PRELOADED_EXCERPTS'] ?? 3),
  },
} as const;
