import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { routePaths } from '../app/routes'
import { ActionButton } from '../components/ui/ActionButton'
import { Notice } from '../components/ui/Notice'
import { Surface } from '../components/ui/Surface'
import { authClient } from '../lib/auth-client'
import {
  AUTH_RETURN_POLL_INTERVAL_MS,
  AUTH_RETURN_TIMEOUT_MS,
  sanitizePostAuthRedirect,
} from '../lib/auth-flow'
import styles from './AuthReturnPage.module.css'

type AuthReturnStatus = 'checking' | 'success' | 'error'

export function AuthReturnPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    data: session,
    isPending,
    isRefetching,
    refetch,
  } = authClient.useSession()
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const [attemptKey, setAttemptKey] = useState(0)
  const redirectTarget = sanitizePostAuthRedirect(searchParams.get('next'))
  const status: AuthReturnStatus = session?.user ? 'success' : hasTimedOut ? 'error' : 'checking'

  useEffect(() => {
    if (session?.user) {
      const redirectTimer = window.setTimeout(() => {
        navigate(redirectTarget, { replace: true })
      }, 450)

      return () => {
        window.clearTimeout(redirectTimer)
      }
    }

    if (hasTimedOut) {
      return
    }

    const pollSession = () => {
      void refetch().catch(() => {})
    }

    pollSession()

    const intervalId = window.setInterval(pollSession, AUTH_RETURN_POLL_INTERVAL_MS)
    const timeoutId = window.setTimeout(() => {
      setHasTimedOut(true)
    }, AUTH_RETURN_TIMEOUT_MS)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [attemptKey, hasTimedOut, navigate, redirectTarget, refetch, session?.user])

  return (
    <div className={styles.page}>
      <Surface className={styles.card} tone="hero">
        <span className={styles.eyebrow}>Spotify 인증</span>
        <h1 className={styles.title}>
          {status === 'success'
            ? 'Spotify 인증이 완료되었습니다'
            : status === 'error'
              ? '세션 확인에 실패했습니다'
              : 'Spotify 인증을 마무리하고 있습니다'}
        </h1>
        <p className={styles.copy}>
          {status === 'success'
            ? '확인된 세션으로 원래 보던 화면으로 바로 돌아갑니다.'
            : status === 'error'
              ? '인증은 끝났지만 세션을 확인하지 못했습니다. 다시 확인하거나 개요 화면으로 이동할 수 있습니다.'
              : '브라우저에 세션이 반영될 때까지 잠시 기다린 뒤 자동으로 이동합니다.'}
        </p>

        {status === 'checking' ? (
          <Notice tone="subtle">
            {isPending || isRefetching ? '세션을 다시 확인하는 중입니다.' : '인증 상태를 준비 중입니다.'}
          </Notice>
        ) : null}
        {status === 'success' ? (
          <Notice tone="success">로그인이 확인되었습니다. 곧 원래 화면으로 이동합니다.</Notice>
        ) : null}
        {status === 'error' ? (
          <Notice tone="error">세션을 확인하지 못했습니다. 다시 시도해 주세요.</Notice>
        ) : null}

        <div className={styles.actions}>
          {status === 'error' ? (
            <>
              <ActionButton
                variant="primary"
                onClick={() => {
                  setHasTimedOut(false)
                  setAttemptKey((value) => value + 1)
                }}
              >
                다시 시도
              </ActionButton>
              <ActionButton to={routePaths.overview}>개요로 이동</ActionButton>
            </>
          ) : (
            <ActionButton disabled variant="secondary">
              이동 준비 중
            </ActionButton>
          )}
        </div>
      </Surface>
    </div>
  )
}
