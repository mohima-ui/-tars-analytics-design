import { Dialog as D, Tooltip as T, DropdownMenu as DM, Popover as P } from 'radix-ui'
import clsx from 'clsx'
import { ArrowDownRight, ArrowUpRight, Info, X, Minus } from 'lucide-react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

export { clsx }

/* ---------- Card ---------- */
export function Card({
  id,
  title,
  description,
  actions,
  children,
  className,
  bodyClass,
}: {
  id?: string
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClass?: string
}) {
  return (
    <section id={id} className={clsx('rounded-xl border border-line bg-surface shadow-xs', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
          <div className="min-w-0">
            {title && (
              <h3 className="inline-flex items-center gap-1.5 text-base font-semibold text-ink">
                {title}
                {description && <InfoTip label={typeof title === 'string' ? title : 'this card'} text={description} />}
              </h3>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx('px-6 pb-6', title || actions ? 'pt-4' : 'pt-6', bodyClass)}>{children}</div>
    </section>
  )
}

export function SectionHeading({ id, title, description, actions }: { id: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div id={id} className="flex flex-wrap items-end justify-between gap-3 pt-4">
      <div>
        {/* The description lives behind an (i) so headings stay short. */}
        <h2 className="inline-flex items-center gap-1.5 text-md font-semibold tracking-tight text-ink">
          {title}
          {description && <InfoTip label={title} text={description} />}
        </h2>
      </div>
      {actions}
    </div>
  )
}

/* ---------- Button ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link' | 'danger'
  size?: 'sm' | 'md'
}
export function Button({ variant = 'secondary', size = 'md', className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
        variant === 'secondary' && 'border border-line bg-surface text-ink shadow-xs hover:bg-subtle',
        variant === 'ghost' && 'text-ink-2 hover:bg-muted hover:text-ink',
        variant === 'link' && 'h-auto px-0 text-brand-600 hover:text-brand-700 hover:underline',
        variant === 'danger' && 'bg-danger-600 text-white hover:bg-danger-700',
        className,
      )}
    />
  )
}

/* ---------- Badge ---------- */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tone === 'neutral' && 'bg-muted text-ink-2',
        tone === 'brand' && 'bg-brand-100 text-brand-700',
        tone === 'success' && 'bg-success-50 text-success-700',
        tone === 'warning' && 'bg-warning-50 text-warning-700',
        tone === 'danger' && 'bg-danger-50 text-danger-700',
        tone === 'info' && 'bg-info-50 text-info-700',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Tooltip ---------- */
export function Tip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <T.Root delayDuration={150}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="anim-fade z-[70] max-w-72 rounded-lg bg-n-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg"
        >
          {content}
          <T.Arrow className="fill-n-900" />
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}

export function InfoTip({ text, label }: { text: ReactNode; label: string }) {
  return (
    <Tip content={text}>
      <button type="button" aria-label={`About ${label}`} className="inline-flex size-5 items-center justify-center rounded-full text-ink-3 hover:text-ink">
        <Info className="size-3.5" />
      </button>
    </Tip>
  )
}

/** Term with an (i) that appears when you hover the term (or tab to it). A span, not a button, so it can sit inside buttons. */
export function Term({ children, def }: { children: ReactNode; def: ReactNode }) {
  return (
    <span className="group/term inline-flex items-center gap-1">
      {children}
      <Tip content={def}>
        <span
          tabIndex={0}
          role="img"
          aria-label={typeof def === 'string' ? def : 'More info'}
          className="inline-flex cursor-help text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-hover/term:opacity-100 hover:text-ink focus-visible:opacity-100"
        >
          <Info className="size-3.5" />
        </span>
      </Tip>
    </span>
  )
}

/* ---------- Delta ---------- */
export function Delta({
  value,
  goodWhenUp = true,
  neutral = false,
  size = 'sm',
  abs,
}: {
  value: number | null
  goodWhenUp?: boolean
  neutral?: boolean
  size?: 'xs' | 'sm'
  abs?: number
}) {
  if (value === null || !isFinite(value)) {
    return <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Minus className="size-3" />No prior data</span>
  }
  const up = value > 0
  const flat = Math.abs(value) < 0.005
  const good = flat ? null : up === goodWhenUp
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-md font-medium tnum',
        size === 'xs' ? 'text-xs' : 'text-sm',
        neutral || good === null ? 'text-ink-2' : good ? 'text-success-700' : 'text-danger-700',
      )}
    >
      <Icon className={size === 'xs' ? 'size-3.5' : 'size-4'} aria-hidden />
      <span className="sr-only">{up ? 'Up' : 'Down'}</span>
      {abs !== undefined ? `${abs > 0 ? '+' : ''}${abs}` : `${Math.abs(value * 100).toFixed(value !== 0 && Math.abs(value) < 0.1 ? 1 : 0)}%`}
    </span>
  )
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-md font-medium whitespace-nowrap transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Sheet (side panel) ---------- */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  actions,
  width = 'max-w-xl',
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Buttons shown at the top right, before the close button */
  actions?: ReactNode
  width?: string
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="anim-fade fixed inset-0 z-50 bg-n-900/30" />
        <D.Content className={clsx('anim-slide fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-xl outline-none', width)}>
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-1">
            <div className="min-w-0">
              <D.Title className="text-base font-semibold text-ink">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-xs text-ink-3">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">Details</D.Description>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <D.Close asChild>
                <Button variant="ghost" size="sm" aria-label="Close" className="size-8 px-0">
                  <X className="size-4" />
                </Button>
              </D.Close>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="anim-fade fixed inset-0 z-50 bg-n-900/30" />
        <D.Content
          className={clsx(
            'anim-pop-v2 fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-surface shadow-xl outline-none',
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
            <div>
              <D.Title className="text-md font-semibold text-ink">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-ink-3">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">Dialog</D.Description>
              )}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Close" className="size-8 px-0">
                <X className="size-4" />
              </Button>
            </D.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

/* ---------- Menu ---------- */
export const Menu = DM.Root
export const MenuTrigger = DM.Trigger
export function MenuContent({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className="anim-fade z-[60] min-w-48 rounded-lg border border-line bg-surface p-1 shadow-lg"
      >
        {children}
      </DM.Content>
    </DM.Portal>
  )
}
export function MenuItem({ children, onSelect, danger, disabled }: { children: ReactNode; onSelect?: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <DM.Item
      disabled={disabled}
      onSelect={onSelect}
      className={clsx(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-muted',
        danger ? 'text-danger-700' : 'text-ink',
      )}
    >
      {children}
    </DM.Item>
  )
}
export function MenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="px-2.5 pt-2 pb-1 text-xs font-medium text-ink-3">{children}</DM.Label>
}
export function MenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-line" />
}

/* ---------- Popover ---------- */
export const Pop = P.Root
export const PopTrigger = P.Trigger
export function PopContent({ children, align = 'start', className }: { children: ReactNode; align?: 'start' | 'end'; className?: string }) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={6}
        className={clsx('anim-fade z-[60] rounded-lg border border-line bg-surface p-1 shadow-lg outline-none', className)}
      >
        {children}
      </P.Content>
    </P.Portal>
  )
}
export const PopClose = P.Close

/* ---------- Misc ---------- */
export function Meter({ value, className, tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'muted' | 'info' }) {
  return (
    <div className={clsx('h-1 overflow-hidden rounded-full', tone === 'muted' ? 'bg-n-100' : 'bg-brand-100', className)}>
      <div
        className={clsx('h-full rounded-full', tone === 'brand' && 'bg-brand-600', tone === 'muted' && 'bg-n-400', tone === 'info' && 'bg-viz-2')}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="rounded border border-line bg-subtle px-1 font-mono text-2xs text-ink-2">{children}</span>
}
