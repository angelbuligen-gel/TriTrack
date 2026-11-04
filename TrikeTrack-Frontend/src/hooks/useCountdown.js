import { useEffect, useState } from 'react'

/**
 * Returns the number of whole seconds remaining until `target`, never
 * below zero. `target` may be a Date, an ISO string, or null.
 */
export default function useCountdown(target) {
  const computeRemaining = () => {
    if (!target) {
      return 0
    }

    const end = target instanceof Date ? target : new Date(target)

    return Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000))
  }

  const [remaining, setRemaining] = useState(computeRemaining)

  useEffect(() => {
    setRemaining(computeRemaining())

    const timer = window.setInterval(() => {
      setRemaining((current) => {
        const next = computeRemaining()

        return next === current ? current : next
      })
    }, 1000)

    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return remaining
}

export function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
