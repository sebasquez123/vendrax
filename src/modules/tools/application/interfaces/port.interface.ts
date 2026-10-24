export interface executorPortInterface<T> {
  RunExecutor(props: T): Promise<any>;
}
