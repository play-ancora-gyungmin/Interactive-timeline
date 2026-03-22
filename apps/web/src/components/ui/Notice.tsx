import type { ReactNode } from 'react'
import styles from './Notice.module.css'

type NoticeProps = {
  children: ReactNode
  tone?: 'info' | 'error' | 'success' | 'subtle'
}

export function Notice({ children, tone = 'info' }: NoticeProps) {
  return <div className={`${styles.notice} ${styles[`notice--${tone}`]}`}>{children}</div>
}
