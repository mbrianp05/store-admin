import BrandMark from './BrandMark'

export default function AppLoader({ mensaje = 'Cargando…' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <BrandMark className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">{mensaje}</p>
      </div>
    </div>
  )
}
