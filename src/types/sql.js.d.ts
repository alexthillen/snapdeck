declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export interface Database {
    run(sql: string, params?: any[]): void
    exec(sql: string, params?: any[]): QueryExecResult[]
    each(
      sql: string,
      params: any[] | undefined,
      callback: (row: any) => void,
      done: () => void,
    ): void
    prepare(sql: string, params?: any[]): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
    create_function(name: string, func: Function): void
  }

  export interface Statement {
    bind(params?: any[]): boolean
    step(): boolean
    get(params?: any[]): any[]
    getColumnNames(): string[]
    getAsObject(params?: any[]): any
    run(params?: any[]): void
    reset(): void
    freemem(): void
    free(): void
  }

  export interface QueryExecResult {
    columns: string[]
    values: any[][]
  }

  export interface Config {
    locateFile?: (filename: string) => string
  }

  export default function initSqlJs(config?: Config): Promise<SqlJsStatic>
}
