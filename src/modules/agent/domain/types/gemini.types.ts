import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage } from 'langchain';

export type GeminiEventStreamStartObject = {
  event: string;
  name: string;
  metadata: { langgraph_step: number };
  data: {
    input: { messages: Array<Array<SystemMessage | HumanMessage | AIMessage>> };
  };
};

export type GeminiEventStreamToolObject = {
  event: string;
  name: string;
  metadata: { langgraph_step: number };
  data: {
    input: string;
  };
};

export type GeminiEventStreamMessageObject = {
  event: string;
  name: string;
  metadata: { langgraph_step: number };
  data: {
    chunk: AIMessageChunk;
  };
};
