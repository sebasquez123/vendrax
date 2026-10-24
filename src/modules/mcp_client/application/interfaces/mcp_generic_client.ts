export interface MCPClientInterface {
  connectToServer(): Promise<void>;
  callTool(toolName: string, argument: Record<string, unknown>): Promise<Record<string, unknown>>;
  getTools(split: number): Promise<Record<string, unknown>[]>;
  setUpTransportEvents(): void;
  closeConnection(): Promise<void>;
}
