import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider
      duration={3000}
      swipeDirection="up"
      swipeThreshold={30}
    >
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            className="rounded-2xl border-0 shadow-xl backdrop-blur-sm bg-foreground/90 text-background px-4 py-3"
          >
            <div className="grid gap-0.5 flex-1">
              {title && (
                <ToastTitle className="text-sm font-bold text-background">
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className="text-xs text-background/80">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-background/60 hover:text-background" />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
