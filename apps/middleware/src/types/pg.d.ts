declare module "pg" {
  export interface PoolConfig {
    connectionString?: string;
    max?: number;
    statement_timeout?: number;
    idleTimeoutMillis?: number;
    application_name?: string;
  }

  export interface QueryResult<R = unknown> {
    readonly rows: R[];
    readonly rowCount: number;
    readonly command: string;
    readonly oid: number;
    readonly fields: Array<Record<string, unknown>>;
  }

  export interface QueryConfig<
    P extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
  > {
    text: string;
    values?: P;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query<
      R = unknown,
      P extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
    >(queryText: string, values?: P): Promise<QueryResult<R>>;
    query<
      R = unknown,
      P extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
    >(config: QueryConfig<P>): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
}
