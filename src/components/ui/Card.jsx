import React from 'react'

export default function Card({ title, right, children, className = '' }) {
  return (
    <section
      className={
        'rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900 ' +
        className
      }
    >
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</div>
          <div className="text-sm text-slate-500 dark:text-slate-300">{right}</div>
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
