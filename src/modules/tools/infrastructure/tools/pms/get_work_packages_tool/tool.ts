import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { OauthToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import { GetWorkPackagesInputSchema, GetWorkPackagesInputType, GetWorkPackagesOutputSchema } from './validator';

export const getWorkPackages = ({ params, callback }: OauthToolParams): DynamicStructuredTool => {
  const { baseUrl } = params.body;

  const toolName = 'Pms__get_work_packages';
  const responseFormat = 'content';
  const endpoint = '/api/v3/work_packages';
  const httpMethod = 'GET';

  const toolResponseConfig = {
    schema: GetWorkPackagesOutputSchema,
  };

  return tool(
    async (args: GetWorkPackagesInputType) => {
      const argument = args || {};
      const argMark = argument ? '?' : '';
      const url = `${baseUrl}${endpoint}${argMark}`;
      const transformedFilters = argument.filters?.map(({ field, ...conditions }) => ({
        [field]: conditions,
      }));

      const transformedArgs = { ...argument, ...(transformedFilters ? { filters: transformedFilters } : {}) };
      return callback({
        serverContext: { url, ...params.body },
        toolContext: { args: { params: transformedArgs, body: {} }, toolName, httpMethod, toolResponseConfig },
        attempts: 0,
      });
    },
    {
      name: toolName,
      description: `
        Get OpenProject work packages using optional filters, pagination and sorting.
        Omit unused arguments.
        
        Important: There are complementary tools, execute them right before this tool and make the right choice according what user requires,
        then execute this tool when you get the needed information.

        Args:
        - offset?: number — Records to skip. Default: 1.
        - pageSize?: number — Max records. Default: 20.
        - sortBy?: Array[] — Column and direction to sort. Default: [["id", "asc"]]
        - groupBy?: string — The column to group by. example: "groupBy": "status"
        - filters?: object[] — Filters to apply.

          Always use IDs, not names.

          Available <filters> fields:
          • assigned_to — Complementary tool is required. — Tool: Pms__get_user_simple_list 
          • author — Complementary tool is required — Tool: Pms__get_user_simple_list 
          • project — Demo project=1, Scrum project=2
          • status: New=1, In progress=7, Closed=12.
          • type: Task=1, Epic=5, Feature=4, Bug=7.

        Response:
        Returns {total, count, pageSize, offset, elements[]}.
        Each element: id, subject, spentTime, laborCosts, startDate, dueDate,
        estimatedTime, remainingTime, percentageDone, createdAt, updatedAt, description.
        Use these fields to complement user search.
      `,
      schema: GetWorkPackagesInputSchema,
      responseFormat,
    }
  );
};

export default { func: getWorkPackages, name: 'get_work_packages' };
