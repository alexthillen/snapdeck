import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import { getDatabase } from '../lib/sql'

/**
 * React hook to initialize and access SQL.js database
 * @returns Object containing database instance, loading state, and error
 */
export const useDatabase = () => {
  const [db, setDb] = useState<Database | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const initDb = async () => {
      try {
        setLoading(true)
        const database = await getDatabase()
        setDb(database)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to initialize database'),
        )
        console.error('Database initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    initDb()
  }, [])

  return { db, loading, error }
}
