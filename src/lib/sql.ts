import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'

const config = {
  locateFile: (filename: string) => `${import.meta.env.BASE_URL}sql/${filename}`,
}

let SQL: SqlJsStatic | null = null
let db: Database | null = null

// Initialize SQL.js
const initSQL = async (): Promise<SqlJsStatic> => {
  if (SQL) {
    return SQL
  }

  try {
    SQL = await initSqlJs(config)
    console.log('SQL.js initialized successfully')
    return SQL
  } catch (error) {
    console.error('Failed to initialize SQL.js:', error)
    throw error
  }
}

// Get or create database instance
export const getDatabase = async (): Promise<Database> => {
  if (db) {
    return db
  }

  const sqlInstance = await initSQL()
  db = new sqlInstance.Database()
  console.log('Database created successfully')
  return db
}

// Get SQL.js instance
export const getSQL = async (): Promise<SqlJsStatic> => {
  return await initSQL()
}

// Close database
export const closeDatabase = (): void => {
  if (db) {
    db.close()
    db = null
    console.log('Database closed')
  }
}

// Export database from memory (for saving)
export const exportDatabase = async (): Promise<Uint8Array> => {
  const database = await getDatabase()
  return database.export()
}

// Load database from file
export const loadDatabase = async (data: Uint8Array): Promise<Database> => {
  const sqlInstance = await initSQL()
  if (db) {
    db.close()
  }
  db = new sqlInstance.Database(data)
  console.log('Database loaded from file')
  return db
}

export default {
  getDatabase,
  getSQL,
  closeDatabase,
  exportDatabase,
  loadDatabase,
}
