import { defineDomainWithModes } from '../define_pack';
import { SERVER } from './00_server/00_server';
import { ADVANCE } from './general/advance';
import { GUIDED } from './general/guided';

export const SUPERSET = defineDomainWithModes({
  server: SERVER,
  subdomains: {
    general: { advance: ADVANCE, guided: GUIDED },
  },
});
