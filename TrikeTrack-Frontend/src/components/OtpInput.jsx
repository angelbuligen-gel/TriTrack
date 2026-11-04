import { useEffect, useRef } from 'react'

const LENGTH = 6

function toSlots(value) {
  return value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('')
}

export default function OtpInput({ value, onChange, disabled = false, onComplete }) {
  const inputs = useRef([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  const slots = toSlots(value)

  const emit = (nextSlots) => {
    const joined = nextSlots.join('').slice(0, LENGTH)
    onChange(joined)

    const compact = joined.replace(/\s/g, '')

    if (compact.length === LENGTH) {
      onComplete?.(compact)
    }
  }

  const handleChange = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1)

    if (!digit) {
      return
    }

    const next = slots.slice()
    next[index] = digit
    emit(next)

    if (index < LENGTH - 1) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()

      const next = slots.slice()

      if (next[index] !== ' ') {
        next[index] = ' '
      } else if (index > 0) {
        next[index - 1] = ' '
        inputs.current[index - 1]?.focus()
      }

      emit(next)
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)

    if (!pasted) {
      return
    }

    event.preventDefault()

    const next = pasted.padEnd(LENGTH, ' ').slice(0, LENGTH).split('')
    emit(next)
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
  }

  return (
    <div className="otp" onPaste={handlePaste}>
      {Array.from({ length: LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element
          }}
          className="otp__digit otp__digit--dark"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={slots[index] === ' ' ? '' : slots[index]}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
        />
      ))}
    </div>
  )
}
