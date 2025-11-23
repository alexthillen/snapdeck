import { notifications } from '@mantine/notifications'

export const notify_error = (error: string, autoClose: number = 5000) => {
  notifications.show({
    title: 'Error',
    message: error,
    color: 'red',
    autoClose: autoClose,
  })
}

export const notify_success = (message: string, autoClose: number = 5000) => {
  notifications.show({
    title: 'Success',
    message: message,
    color: 'green',
    autoClose: autoClose,
  })
}

export const notify_info = (message: string, autoClose: number = 5000) => {
  notifications.show({
    title: 'Info',
    message: message,
    color: 'blue',
    autoClose: autoClose,
  })
}
