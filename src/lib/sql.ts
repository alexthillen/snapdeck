import initSqlJs from 'sql.js'
import type { SqlJsStatic } from 'sql.js'

const config = {
  locateFile: (filename: string) => `${import.meta.env.BASE_URL}sql/${filename}`,
}

let sqlJs: Promise<SqlJsStatic> | undefined

export const getSqlJs = (): Promise<SqlJsStatic> => {
  sqlJs ??= initSqlJs(config)
  return sqlJs
}
