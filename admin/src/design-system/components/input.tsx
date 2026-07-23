import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-spoto border border-spoto-line bg-spoto-surface-2 px-4 text-base font-medium text-spoto-ink outline-none transition-colors placeholder:text-spoto-muted focus:border-spoto-purple focus:ring-2 focus:ring-spoto-purple/25";

export function SpotoInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("min-h-14", fieldBase, className)} {...props} />;
}

export function SpotoSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("min-h-14", fieldBase, className)} {...props} />;
}

export function SpotoTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-28 resize-none py-3", fieldBase, className)} {...props} />;
}
