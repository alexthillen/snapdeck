import { Timestamp } from 'firebase/firestore'

export const formatDate = (
  date: string | Date | Timestamp | null | undefined,
): string => {
  if (!date) return 'Unknown'

  let d: Date
  if (typeof date === 'string') {
    d = new Date(date)
  } else if (date instanceof Timestamp) {
    d = date.toDate()
  } else if (date instanceof Date) {
    d = date
  } else {
    return 'Unknown'
  }

  const pad = (n: number) => n.toString().padStart(2, '0')
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())

  return `${day}/${month}/${year} ${hours}:${minutes}`
}
