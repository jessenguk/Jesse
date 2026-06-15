import type { ReactNode } from 'react'

interface SectionCardProps {
  index: number
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export default function SectionCard({ index, title, subtitle, children, footer }: SectionCardProps) {
  return (
    <section
      className="animate-fade-up rounded-xl border border-gray-200 bg-white p-5 shadow-card sm:p-6"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <header className="mb-4 flex items-baseline gap-3 border-b border-gray-100 pb-3">
        <span className="font-mono text-xs tracking-widest text-gray-400">{String(index).padStart(2, '0')}</span>
        <div>
          <h2 className="text-base font-bold tracking-wide text-navy-900 sm:text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
      </header>
      <div>{children}</div>
      {footer && (
        <footer className="mt-4 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">{footer}</footer>
      )}
    </section>
  )
}
