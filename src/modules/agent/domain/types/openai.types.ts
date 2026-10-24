import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage } from 'langchain';

export type OpenAiEventStreamStartObject = {
  event: string;
  name: string;
  metadata: { langgraph_step: number };
  data: {
    input: { messages: Array<Array<SystemMessage | HumanMessage | AIMessage>> };
  };
};

export type OpenAiEventStreamToolObject = {
  event: string;
  name: string;
  metadata: { langgraph_step: number };
  data: {
    input: string;
  };
};

export type OpenAiEventStreamMessageObject = {
  event: string;
  name: string;
  metadata: { langgraph_step: number };
  data: {
    chunk: AIMessageChunk;
  };
};
