import { useEffect } from 'react'
import useToastStore from '../../store/toastStore.js'

function ToastItem({ toast }) {
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 2500)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  return (
    <div className={`toast toast-${toast.type}`} role="alert">
      {toast.message}
    </div>
  )
}

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
