import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './ActionButton.module.css'

type ActionButtonProps = {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  fullWidth?: boolean
  to?: string
  href?: string
} & ButtonHTMLAttributes<HTMLButtonElement>

export function ActionButton({
  children,
  variant = 'secondary',
  fullWidth = false,
  to,
  href,
  className,
  type = 'button',
  ...buttonProps
}: ActionButtonProps) {
  const classes = [
    styles.button,
    styles[`button--${variant}`],
    fullWidth ? styles['button--fullWidth'] : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  if (to) {
    return (
      <Link className={classes} to={to}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a className={classes} href={href} rel="noreferrer" target="_blank">
        {children}
      </a>
    )
  }

  return (
    <button className={classes} type={type} {...buttonProps}>
      {children}
    </button>
  )
}
