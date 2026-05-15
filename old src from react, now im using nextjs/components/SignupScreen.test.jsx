import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import SignupScreen from './SignupScreen'

vi.mock('./ThemeToggle', () => ({
  default: () => null,
}))

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}))

function renderSignupScreen(props = {}) {
  const defaultProps = {
    onBack: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  }

  return render(
    <SignupScreen {...defaultProps} {...props} />,
  )
}

describe('SignupScreen', () => {
  it('blocks submit when passwords do not match', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSignupScreen({ onSubmit })

    await user.type(screen.getByLabelText(/username/i), 'student_user')
    await user.type(screen.getByLabelText(/email/i), 'student@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'different123')

    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Passwords do not match')
  })
})
