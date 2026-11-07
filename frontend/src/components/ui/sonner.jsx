import { Toaster as Sonner } from 'sonner'

function Toaster(props) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast !rounded-xl !border !border-border !bg-muted !text-foreground !shadow-[0_16px_44px_rgba(0,0,0,0.45)]',
          description: '!text-muted-foreground',
          actionButton:
            'group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground',
          cancelButton:
            'group-[.toast]:!bg-secondary group-[.toast]:!text-secondary-foreground',
          success: '!border-primary/30',
          error: '!border-destructive/30',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
