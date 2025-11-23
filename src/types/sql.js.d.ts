declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string, params?: unknown[]): QueryExecResult[]
    each(
      sql: string,
      params: unknown[] | undefined,
      callback: (row: Record<string, unknown>) => void,
      done: () => void,
    ): void
    prepare(sql: string, params?: unknown[]): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
    create_function(name: string, func: (...args: unknown[]) => unknown): void
  }

  export interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    get(params?: unknown[]): unknown[]
    getColumnNames(): string[]
    getAsObject(params?: unknown[]): Record<string, unknown>
    run(params?: unknown[]): void
    reset(): void
    freemem(): void
    free(): void
  }

  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  export interface Config {
    locateFile?: (filename: string) => string
  }

  export default function initSqlJs(config?: Config): Promise<SqlJsStatic>
}
