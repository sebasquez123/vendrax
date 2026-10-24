import { tool } from '@langchain/core/tools';
import type { DynamicTool } from '@langchain/core/tools';
import { OauthToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';

export const StartOauth = ({ params, consentScreenCB }: OauthToolParams): DynamicTool<string, unknown> => {
  const { baseUrl, refreshEndpoint } = params.body;

  const toolName = 'Pms__start_pms_oauth';
  const responseFormat = 'content';

  return tool(
    async (_args) => {
      const url = `${baseUrl}${refreshEndpoint}?`;
      return consentScreenCB({
        url,
        ...params.body,
      });
    },
    {
      name: toolName,
      description: `
      Initiates the OAuth flow for a user for access to PMS resources.

      Args:
          No args required

      Returns:
          str: Encourages the user to log in the platform server and provides the authorization url.
      `,
      responseFormat,
    }
  );
};

export default { func: StartOauth, name: 'start_pms_oauth' };
