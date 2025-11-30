import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'

const config = {
  locateFile: (filename: string) => `${import.meta.env.BASE_URL}sql/${filename}`,
}

let SQL: SqlJsStatic | undefined

initSqlJs(config).then(function (sql) {
  // Create the database
  SQL = sql
  console.log('SQL.js initialized (direct implementation)')
})

// Export for use in other modules if needed
export { SQL }
export const createDatabase = (): Database | undefined => {
  if (SQL) {
    return new SQL.Database()
  }
  console.warn('SQL.js not yet initialized')
  return undefined
}
