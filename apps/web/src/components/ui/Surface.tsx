import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Surface.module.css'

type SurfaceProps = {
  children: ReactNode
  tone?: 'default' | 'hero' | 'muted'
} & HTMLAttributes<HTMLDivElement>

export function Surface({
  children,
  tone = 'default',
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={[styles.surface, styles[`surface--${tone}`], className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
