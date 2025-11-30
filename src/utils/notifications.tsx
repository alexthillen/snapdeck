import { notifications } from '@mantine/notifications'
import { IconCheck } from '@tabler/icons-react'

export const notify_error = (error: string, autoClose: number = 5000) => {
  notifications.show({
    title: 'Error',
    message: error,
    color: 'red',
    position: 'top-right',
    autoClose: autoClose,
  })
}

export const notify_success = (message: string, autoClose: number = 5000) => {
  notifications.show({
    title: 'Success',
    message: message,
    color: 'green',
    icon: <IconCheck size={20} />,
    position: 'top-right',
    autoClose: autoClose,
  })
}

export const notify_info = (message: string, autoClose: number = 5000) => {
  notifications.show({
    title: 'Info',
    message: message,
    color: 'blue',
    position: 'top-right',
    autoClose: autoClose,
  })
}
