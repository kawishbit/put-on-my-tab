"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps): React.JSX.Element {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl",
          title: "font-semibold",
          description: "text-slate-600",
        },
      }}
      {...props}
    />
  );
}
