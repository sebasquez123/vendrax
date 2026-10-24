import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { OauthToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import { GetUserListInputSchema, GetUserListOutputSchema, GetUserListInputType } from './validator';

export const getUserSimpleList = ({ params, callback }: OauthToolParams): DynamicStructuredTool => {
  const { baseUrl } = params.body;

  const toolName = 'Pms__get_user_simple_list';
  const responseFormat = 'content';
  const endpoint = '/api/v3/users';
  const httpMethod = 'GET';

  const toolResponseConfig = {
    schema: GetUserListOutputSchema,
  };

  return tool(
    async (args: GetUserListInputType) => {
      const argument = args || {};
      const argMark = argument ? '?' : '';
      const url = `${baseUrl}${endpoint}${argMark}`;

      return callback({
        serverContext: { url, ...params.body },
        toolContext: { args: { params: argument, body: {} }, toolName, httpMethod, toolResponseConfig },
        attempts: 0,
      });
    },
    {
      name: toolName,
      description: `
        Get OpenProject simple user list, this serves exclusively as complementary tool.
        Omit unused arguments.

        Args:
        - offset?: number — Records to skip. Default: 1.
        - pageSize?: number — Max records. Default: 20.

        Examples:
          {"offset": 1}
          {"pageSize": 100}

        Response:
        Returns {total, count, pageSize, offset, elements[]}.
        Each element may contain:
        id, name, firstName, lastName, email, login, status,
        admin, language, createdAt, updatedAt.

        Use these fields to complement user search.
      `,
      schema: GetUserListInputSchema,
      responseFormat,
    }
  );
};

export default { func: getUserSimpleList, name: 'get_user_simple_list' };
