import type { InterfaceEvent } from '~/modules/context/domain/client_state';

export interface ClientState {
  domain?: string;
  selectedDashboard?: { id: number; uuid?: string; title?: string };
  events: InterfaceEvent[];
}

export type Read<T> = { value?: T; issues: string[] };

export interface StateBlockInput {
  state: ClientState;
}
