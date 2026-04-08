import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginScreen from './LoginScreen'

vi.mock('./ThemeToggle', () => ({
  default: () => null,
}))

function renderLoginScreen(props = {}) {
  const defaultProps = {
    onBack: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  }

  return render(
    <LoginScreen {...defaultProps} {...props} />,
  )
}

function createDeferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('LoginScreen', () => {
  it('submits credentials and shows loading while request is in flight', async () => {
    const user = userEvent.setup()
    const deferred = createDeferred()
    const onSubmit = vi.fn(() => deferred.promise)

    renderLoginScreen({ onSubmit })

    await user.type(screen.getByLabelText(/email/i), 'student@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'password123',
    })
    expect(screen.getByRole('button', { name: 'Logging in...' })).toBeDisabled()

    deferred.resolve()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled()
    })
  })
})
