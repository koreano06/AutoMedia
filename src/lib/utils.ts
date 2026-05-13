import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export function createPageUrl(pageName: string) {
  return '/' + pageName.replace(/ /g, '-');
}

export const isIframe = window.self !== window.top;
