import { Module } from '@nestjs/common';

import { McpClientController } from './presentation/mcp_client.controller';
import { McpClientCheckout } from './application/services/checkout.service';
import { LangchainMCPClient } from './infrastructure';

@Module({
  controllers: [McpClientController],
  providers: [McpClientCheckout, LangchainMCPClient],
  exports: [LangchainMCPClient],
})
export class McpClientModule {}
