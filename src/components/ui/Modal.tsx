import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

interface DialogShellProps {
  open: boolean
  onClose: () => void
  /** When false, Escape and backdrop clicks do nothing. Use while a transaction is in flight. */
  dismissible?: boolean
  labelledBy?: string
  describedBy?: string
  ariaLabel?: string
  className: string
  children: ReactNode
}

/**
 * Native <dialog> gives focus trapping, Escape handling and an inert background for free.
 * We only add scroll locking and backdrop-click dismissal.
 */
function DialogShell({ open, onClose, dismissible = true, labelledBy, describedBy, ariaLabel, className, children }: DialogShellProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    if (!dialog.open) dialog.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-label={ariaLabel}
      onCancel={(event) => {
        event.preventDefault()
        if (dismissible) onClose()
      }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose()
      }}
      className={cn('fixed p-0 text-ink shadow-pop backdrop:bg-brand-navy/40 backdrop:backdrop-blur-sm', className)}
    >
      {children}
    </dialog>
  )
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  dismissible?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-xl' }

/** Bottom sheet on mobile, centred dialog from tablet up. */
export function Modal({ open, onClose, title, description, children, footer, dismissible = true, size = 'md' }: ModalProps) {
  const uid = useId()
  const titleId = `modal-title-${uid}`
  const descId = description ? `modal-desc-${uid}` : undefined

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      dismissible={dismissible}
      labelledBy={titleId}
      describedBy={descId}
      className={cn(
        'open:flex open:flex-col bg-surface',
        'inset-x-0 bottom-0 top-auto m-0 h-[min(90dvh,44rem)] w-full max-w-none animate-sheet-up overscroll-none rounded-t-panel',
        'md:inset-0 md:m-auto md:h-fit md:max-h-[85dvh] md:w-[calc(100%-3rem)] md:animate-fade-in md:rounded-panel',
        sizes[size],
      )}
    >
      <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong md:hidden" aria-hidden />
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4 md:px-6 md:pt-6">
        <div className="min-w-0">
          <h2 id={titleId} className="text-section text-brand-navy">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-body text-ink-soft">
              {description}
            </p>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-control text-ink-soft hover:bg-brand-mist"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>
      {children && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3 md:px-6">{children}</div>}
      {footer && (
        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end md:px-6">
          {footer}
        </div>
      )}
    </DialogShell>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  /** Real details of the action, for example recipient and amount, shown before the user confirms. */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'destructive'
  /** Shows progress on the confirm button and blocks dismissal. */
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      dismissible={!loading}
      size="sm"
      title={
        <span className="flex items-center gap-3">
          {tone === 'destructive' && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger" aria-hidden>
              <AlertTriangle className="size-5" />
            </span>
          )}
          {title}
        </span>
      }
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'destructive' ? 'destructive' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}

/** Left-hand navigation drawer for mobile. */
export function Drawer({ open, onClose, label, children }: DrawerProps) {
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      ariaLabel={label}
      className="inset-y-0 left-0 right-auto top-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] animate-drawer-in overflow-y-auto bg-brand-navy bg-navy-gradient text-white"
    >
      {children}
    </DialogShell>
  )
}
