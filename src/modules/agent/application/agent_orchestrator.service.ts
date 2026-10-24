import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';

import { Gemini, OpenAi } from '../infrastructure';
import { type MCPAgentPortInterface, StreamInferAdapterParams } from '~/modules/agent/application/interfaces/port.interface';
import { AgentEngines, McpAgentWorkflowParams } from './interfaces/orchestrator.interface';
import { AgentNoFoundError, AgentLoadError, DomainErrorCodes as e } from '../domain/errors';
import config from '~/config';
import type { MessageContextType } from '~/modules/chat/domain/validator/message_input';
import { SummaryInput, SummaryPrompt } from '../domain/summary.prompt';

/**
 * Orquestador de agentes
 * Orquesta varios modelos bajo demanda del usuario, con máximo desacoplamiento de los adaptadores.
 */
@Injectable()
export class AgentOrchestratorService {
  private logger = new LoggerService(AgentOrchestratorService.name);
  private adapters: Map<string, { adapter: MCPAgentPortInterface; model: string }> = new Map();
  private currentModel: { adapter: MCPAgentPortInterface; model: string } | undefined = undefined;
  private defaultPrompt: string =
    'Be polite by replying the user in a friendly manner that the server is not available at the moment for every request, and that they should try again later.';
  constructor(
    private readonly geminiAdapterService: Gemini,
    private readonly openAiAdapterService: OpenAi
  ) {}

  async onModuleInit(): Promise<void> {
    if (config.llm.gemini.enable)
      this.adapters.set(AgentEngines.GEMINI, {
        adapter: this.geminiAdapterService,
        model: config.llm.gemini.model,
      });
    if (config.llm.openai.enable)
      this.adapters.set(AgentEngines.OPENAI, {
        adapter: this.openAiAdapterService,
        model: config.llm.openai.model,
      });
    const loadedAdapters = Array.from(this.adapters.keys());
    this.currentModel = this.adapters.get(loadedAdapters.at(0)!);

    if (!this.currentModel)
      throw new AgentLoadError(`No adapters loaded correctly. Check adapters' configuration.`, e.ADAPTER_LOADING_ERROR, {
        adapters: loadedAdapters,
      });

    this.logger.info(`MCP Agent Orchestrator initialized with adapters: ${loadedAdapters.join(', ')}`);
  }

  public async getAvailableProviders(): Promise<string[]> {
    const availableProviders: string[] = [];
    this.logger.debug(`Checking available providers...`);
    const arrayOfAdapters = Array.from(this.adapters.entries());
    await Promise.all(
      arrayOfAdapters.map(async ([key, a]) => {
        const isAvailable = await a.adapter.McpHealthCheck(a.model);
        if (!isAvailable) {
          this.logger.warn(`Provider ${a.model} is not available`);
          return;
        }
        availableProviders.push(key);
        this.logger.debug(`Available provider: ${a.model}`);
      })
    );
    return availableProviders;
  }

  /**
   * Resumen de la conversación
   * Compacta el resumen previo y los mensajes que salen con el adaptador de SUMMARY_AGENT y su modelo de resumen.
   */
  public async summarize(previousSummary: string | undefined, messages: MessageContextType[]): Promise<{ summary: string; model: string }> {
    const engine = config.summary.agent;
    const selected = this.adapters.get(engine);
    if (!selected)
      throw new AgentNoFoundError(`The summary adapter '${engine}' is not enabled`, e.NO_ADAPTER_FOUND_ERROR, {
        adapters: Array.from(this.adapters.keys()),
      });
    const model = engine === AgentEngines.OPENAI ? config.llm.openai.summaryModel : config.llm.gemini.summaryModel;
    const summary = await selected.adapter.RunCompletion({
      systemPrompt: SummaryPrompt(config.summary.maxWords),
      input: SummaryInput(previousSummary, messages),
      model_name: model,
    });
    return { summary: summary.trim(), model: `${engine}/${model}` };
  }

  public async runAgentWorkFlow(
    { context, newMessage, agent, toolSet, prompt, middleware }: McpAgentWorkflowParams,
    stream: Partial<StreamInferAdapterParams>
  ): Promise<void> {
    const model = agent ?? AgentEngines.GEMINI;
    const selected = this.resolveAdapter(model);

    await selected.adapter.RunInference({
      context: context,
      newMessage: newMessage,
      tools: toolSet,
      systemPrompt: prompt ?? this.defaultPrompt,
      model_name: selected.model,
      middleware,
      onMessageChunk: stream.onMessageChunk,
      onThinkingChunk: stream.onThinkingChunk,
      onContextInit: stream.onContextInit,
      onToolCall: stream.onToolCall,
      onFinalUsage: stream.onFinalUsage,
      signal: stream.signal,
    });
    return;
  }

  private resolveAdapter(model: string): { adapter: MCPAgentPortInterface; model: string } {
    const selected = this.adapters.get(model) ?? this.currentModel;
    if (!selected)
      throw new AgentNoFoundError(`No adapter found for model: ${model}`, e.NO_ADAPTER_FOUND_ERROR, {
        adapters: Array.from(this.adapters.keys()),
        model,
      });
    return selected;
  }
}
