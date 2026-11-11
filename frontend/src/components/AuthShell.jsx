import BrandMark from './BrandMark'

export default function AuthShell({ title, description, children, footer }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,rgb(227_189_99/0.08),transparent_65%)]"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <BrandMark className="size-6" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-none tracking-tight">Mostrador</p>
            <p className="mt-1.5 text-xs text-muted-foreground">Insumos para bijouterie</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-6 grid gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        )}
      </div>
    </div>
  )
}
