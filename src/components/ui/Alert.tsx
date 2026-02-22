interface AlertProps {
  type: 'error' | 'success' | 'info'
  children: React.ReactNode
}

export default function Alert({ type, children }: AlertProps) {
  const styles = {
    error:   'bg-red-50 text-red-800 border border-red-200',
    success: 'bg-green-50 text-green-800 border border-green-200',
    info:    'bg-blue-50 text-blue-800 border border-blue-200',
  }

  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${styles[type]}`}>
      {children}
    </div>
  )
}
