import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Skeleton } from '@/components/ui'

interface QrResult {
  value: string
  src?: string
  failed?: boolean
}

/** Renders a QR code for `value` as an image. Shows a placeholder while there is nothing to encode. */
export function QrCode({ value, label }: { value?: string; label: string }) {
  // The result remembers which value it was drawn for, so a changed value shows the placeholder until redrawn.
  const [result, setResult] = useState<QrResult>()
  const current = result && result.value === value ? result : undefined

  useEffect(() => {
    if (!value) return
    let cancelled = false
    QRCode.toDataURL(value, { margin: 1, width: 280, errorCorrectionLevel: 'M', color: { dark: '#17294B', light: '#FFFFFF' } })
      .then((url) => !cancelled && setResult({ value, src: url }))
      .catch(() => !cancelled && setResult({ value, failed: true }))
    return () => {
      cancelled = true
    }
  }, [value])

  return (
    <div className="mx-auto flex aspect-square w-full max-w-[17.5rem] items-center justify-center rounded-card border border-line bg-surface p-3">
      {current?.src ? (
        <img src={current.src} alt={label} className="size-full" />
      ) : current?.failed ? (
        <p className="px-4 text-center text-support text-danger">The QR code could not be drawn. Use the link instead.</p>
      ) : (
        <Skeleton className="size-full" />
      )}
    </div>
  )
}
