export interface IUseCase<T = unknown, TRes = unknown> {
  // eslint-disable-next-line no-unused-vars
  execute: (params: T) => Promise<TRes>
}
