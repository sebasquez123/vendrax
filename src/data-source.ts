import { DataSource } from 'typeorm';

import config from './config';
import { QueryLogger } from './shared/logging/query.logger';

export default new DataSource({
  ...config.dbConfig,
  entities: [...config.dbConfig.entities],
  migrations: [...config.dbConfig.migrations],
  logger: new QueryLogger(),
});
