import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge only knows Tailwind's built-in scale. Our custom type, radius, shadow and
 * gradient tokens (see tailwind.config.js) must be registered here, otherwise it mistakes
 * `text-body` for a text COLOUR and silently drops the real colour (for example `text-white`
 * on a button), or drops the font size when a colour is also present.
 * Keep these lists in sync with tailwind.config.js.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['page-sm', 'page', 'section', 'body', 'support', 'label', 'overline', 'figure-sm', 'figure', 'figure-lg'] },
      ],
      rounded: [{ rounded: ['control', 'card', 'panel'] }],
      shadow: [{ shadow: ['card', 'raised', 'pop'] }],
      'bg-image': [{ bg: ['brand-gradient', 'soft-gradient', 'navy-gradient'] }],
    },
  },
})

/** Compose class names and resolve conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
