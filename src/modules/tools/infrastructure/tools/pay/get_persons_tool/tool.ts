import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { JwtToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import { GetPersonsInputSchema, GetPersonsInputType, GetPersonsOutputSchema } from './validator';

export const getPersons = ({ params, callback }: JwtToolParams): DynamicStructuredTool => {
  const { serverName, baseUrl } = params.body;

  const responseFormat = 'content';
  const toolName = 'Pay__get_persons';
  const endpoint = '/PERSON/ALL_BY_TREE/BY_CLIENT/';
  const httpMethod = 'GET';

  const toolResponseConfig = {
    schema: GetPersonsOutputSchema,
  };

  return tool(
    async (args: GetPersonsInputType) => {
      const argument: Partial<GetPersonsInputType> = args || {};

      const argMark = Object.keys(argument).some((key) => key !== 'routeParamId') ? '?' : '';
      const url = `${baseUrl}${endpoint}${argument.routeParamId}${argMark}`;

      delete argument.routeParamId;
      const transformedWhere = argument.where?.map(({ field, ...conditions }) => ({
        [field]: conditions,
      }));
      const transformedArgs = { ...argument, ...(transformedWhere ? { where: transformedWhere } : {}) };
      return await callback({
        serverContext: { url, serverName, token: params.headers.token },
        toolContext: { args: { params: transformedArgs, body: {} }, toolName, httpMethod, toolResponseConfig },
      });
    },
    {
      name: toolName,
      description: `
      Get persons using optional search, filters, pagination and sorting.

      Omit unused arguments.
      Important: 
      - When filtering, searching or including, use the available fields and operators exactly as supported by the schema.

      Args:
      routeParamId (Required): number
        - options: 
          - Ente gestor Sitme Bucaramanga = 725
          - operador de recaudo bucaramanga = 728
        - If not provided ask user for providing the client as "Ente gestor" or "Operador de recaudo" first before executing the tool.

      page?: number — Page number. Default: 1.
      pageSize?: number — Max records. Default: 10.
      search?: string — Global search across searchColumns.
      where?: object[] — Filters. Format:
      sorted?: object[] — Sorting. Format:

      Response:
      Returns {success, data, message}, where data contains rows and count.
      If no records are found or an error is retuned, a message will inform you.
      `,
      schema: GetPersonsInputSchema,
      responseFormat,
    }
  );
};

export default { func: getPersons, name: 'get_persons' };
