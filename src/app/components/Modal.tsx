'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { IconClose } from '@/src/app/components/icons'

export interface ModalProps {
  /**
   * Optional controlled open state.
   * If provided, the component becomes controlled and `onOpenChange` is required for updates.
   */
  open?: boolean
  /**
   * Uncontrolled initial open state.
   */
  defaultOpen?: boolean
  /**
   * Called when the open state changes (both controlled and uncontrolled usage).
   */
  onOpenChange?: (open: boolean) => void
  /**
   * Optional trigger element (e.g. a button) that toggles the modal.
   * When provided, it will be wrapped in `DialogPrimitive.Trigger`.
   */
  trigger?: React.ReactNode
  /**
   * Modal title rendered in the header.
   */
  title?: React.ReactNode
  /**
   * Optional description rendered under the title.
   */
  description?: React.ReactNode
  /**
   * Optional footer (typically action buttons).
   */
  footer?: React.ReactNode
  /**
   * Main modal content.
   */
  children?: React.ReactNode
  /**
   * When true (default), renders a close icon button in the top-right corner.
   */
  showCloseIcon?: boolean
  /**
   * Additional class names for the dialog content container.
   */
  className?: string
}

/**
 * Reusable Modal component built on top of Radix `Dialog`.
 *
 * Usage (uncontrolled with trigger):
 *
 * ```tsx
 * <Modal
 *   trigger={<button>Open</button>}
 *   title="Confirm action"
 *   footer={
 *     <div className="flex justify-end gap-3">
 *       <button type="button" className="...">Cancel</button>
 *       <button type="submit" className="...">Confirm</button>
 *     </div>
 *   }
 * >
 *   <p>Are you sure you want to continue?</p>
 * </Modal>
 * ```
 */
export function Modal({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  children,
  showCloseIcon = true,
  className
}: ModalProps) {
  const isControlled = typeof open === 'boolean'

  return (
    <DialogPrimitive.Root
      open={isControlled ? open : undefined}
      defaultOpen={isControlled ? undefined : defaultOpen}
      onOpenChange={onOpenChange}
    >
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0' />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl outline-none',
            'max-h-[90vh] flex flex-col',
            // 'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            // 'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'focus-visible:outline-none',
            className
          )}
        >
          {(title || description) && (
            <header className='mb-4 flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                {title && (
                  <DialogPrimitive.Title className='truncate text-base font-semibold text-gray-900'>
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className='mt-1 text-sm text-gray-600'>
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>

              {showCloseIcon && (
                <DialogPrimitive.Close
                  className='inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-gray-300'
                  aria-label='Close'
                >
                  <IconClose className='h-4 w-4' />
                </DialogPrimitive.Close>
              )}
            </header>
          )}

          {children && (
            <div className='flex-1 overflow-y-auto space-y-3 text-sm text-gray-700'>
              {children}
            </div>
          )}

          {footer && <footer className='mt-6 shrink-0'>{footer}</footer>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export const ModalRoot = DialogPrimitive.Root
export const ModalTrigger = DialogPrimitive.Trigger
export const ModalContent = DialogPrimitive.Content
export const ModalTitle = DialogPrimitive.Title
export const ModalDescription = DialogPrimitive.Description
export const ModalClose = DialogPrimitive.Close


