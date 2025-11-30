export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reader.abort()
      reject(new Error('Failed to read file as base64'))
    }

    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Unexpected file reader result type'))
        return
      }

      const [, base64 = ''] = result.split(',', 2)
      if (!base64) {
        reject(new Error('Could not extract base64 payload from file'))
        return
      }
      resolve(base64)
    }

    reader.readAsDataURL(file)
  })
