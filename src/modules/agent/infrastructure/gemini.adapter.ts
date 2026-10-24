import { Injectable } from '@nestjs/common';
import { CompletionAdapterParams, MCPAgentPortInterface, StreamInferAdapterParams } from '~/modules/agent/application/interfaces/port.interface';
import { GeminiEventStreamMessageObject, GeminiEventStreamToolObject } from '../domain/types/gemini.types';
import { ContentBlock, createAgent } from 'langchain';
import { LoggerService } from '~/shared/logging/main.logger';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import config from '~/config';
import { buildAgentGuards } from '../domain/guards/agent.guards';
import { GoogleGenerativeAIThinkingConfig } from 'node_modules/@langchain/google-genai/dist/types.cjs';

@Injectable()
export class GeminiAdapterService implements MCPAgentPortInterface {
  private logger = new LoggerService(GeminiAdapterService.name);
  constructor() {}

  public async McpHealthCheck(model_name: string): Promise<boolean> {
    try {
      const aiModel = new ChatGoogleGenerativeAI({
        model: model_name,
        apiKey: config.llm.gemini.apikey,
        temperature: 0,
        maxRetries: 1,
        maxOutputTokens: 5,
      });

      await aiModel.invoke('ping', { signal: AbortSignal.timeout(4000) });

      return true;
    } catch (error: any) {
      this.logger.error(`Gemini - ${model_name} Health Check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Llamada simple
   * Una respuesta de texto sin herramientas ni stream, para trabajos internos como el resumen de la conversación.
   */
  public async RunCompletion({ systemPrompt, input, model_name }: CompletionAdapterParams): Promise<string> {
    const aiModel = new ChatGoogleGenerativeAI({
      model: model_name,
      apiKey: config.llm.gemini.apikey,
      temperature: 0,
      maxRetries: 2,
      maxOutputTokens: config.llm.gemini.maxOutputTokens,
    });
    const response = await aiModel.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ]);
    return this.extractChunkText(response.content as string | (ContentBlock | ContentBlock.Text)[]);
  }

  public async RunInference({
    context,
    newMessage,
    tools,
    systemPrompt,
    model_name,
    middleware,
    onMessageChunk,
    onToolCall,
    onFinalUsage,
    signal,
  }: StreamInferAdapterParams): Promise<void> {
    const thinking = true;

    const aiModel = new ChatGoogleGenerativeAI({
      model: model_name,
      apiKey: config.llm.gemini.apikey,
      temperature: 0.2,
      maxRetries: 2,
      maxOutputTokens: config.llm.gemini.maxOutputTokens,
      thinkingConfig: thinking
        ? ({
            includeThoughts: true,
            thinkingLevel: config.llm.gemini.thinkingLevel,
          } as GoogleGenerativeAIThinkingConfig)
        : undefined,
    });

    const agent = createAgent({
      model: aiModel,
      tools,
      systemPrompt: systemPrompt ?? '',
      middleware: buildAgentGuards(middleware),
    });

    const userContext = [
      ...context.map((message) => ({
        role: message.usertype === 'user' ? 'user' : 'assistant',
        content: message.message,
      })),
      {
        role: 'user',
        content: newMessage,
      },
    ];

    let response = '';
    let toolcalling = 0;
    try {
      const eventStream = await agent.streamEvents(
        { messages: userContext },
        { version: 'v2', recursionLimit: config.tools.agentRecursionLimit, signal }
      );

      for await (const object of eventStream as AsyncIterable<object>) {
        const eventObject = object as { event: string };
        const eventName = eventObject.event;
        switch (eventName) {
          case 'on_chat_model_stream': {
            const chunkEvent = eventObject as GeminiEventStreamMessageObject;
            const content = chunkEvent.data.chunk.content;
            const text = this.extractChunkText(content);
            if (text !== '') {
              response += text;
              onMessageChunk?.(text);
            }
            break;
          }
          case 'on_tool_start': {
            const toolEvent = eventObject as GeminiEventStreamToolObject;
            toolcalling += 1;
            onToolCall?.(toolEvent.name, toolEvent.data.input);
            break;
          }
          case 'on_tool_error': {
            break;
          }
        }
      }
    } catch (error) {
      if (!signal?.aborted) throw error;
    }
    if (signal?.aborted) {
      this.logger.debug(`Stream stopped by the client after ${toolcalling} tool calls`);
      onFinalUsage?.(undefined, { done: true, done_reason: 'aborted' });
      return;
    }
    onFinalUsage?.(undefined, {
      done: true,
      done_reason: 'completed',
    });

    if (!response.length) onMessageChunk?.('No response from agent.');

    return;
  }

  private extractChunkText(content: string | (ContentBlock | ContentBlock.Text)[]): string {
    if (typeof content === 'string') return content;

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (item && typeof item === 'object' && item.type === 'text' && 'text' in item) {
            const text = (item as { text?: string }).text;
            return typeof text === 'string' ? text : '';
          }

          return '';
        })
        .join('');
    }
    return '';
  }
}
