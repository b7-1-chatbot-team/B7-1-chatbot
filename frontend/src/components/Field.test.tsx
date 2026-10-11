import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { useField } from '@/hooks/useField'
import { validatePassword } from '@/utils/validators'
import { Field } from './Field'

function PasswordField() {
  const field = useField({ validate: validatePassword })
  return <Field label="비밀번호" field={field} type="password" hint="8자 이상" />
}

describe('Field', () => {
  it('오류가 없으면 도움말을 보여주고 입력과 연결한다', () => {
    render(<PasswordField />)
    const input = screen.getByLabelText('비밀번호')
    expect(screen.getByText('8자 이상')).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('8자 이상')
  })

  it('오류가 생기면 도움말 대신 오류를 보여준다 — 같은 규칙을 두 줄로 말하지 않는다', async () => {
    render(<PasswordField />)
    const input = screen.getByLabelText('비밀번호')
    await userEvent.type(input, '123')
    await userEvent.tab()

    expect(screen.queryByText('8자 이상')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('비밀번호는 8자 이상으로 입력해 주세요.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('비밀번호는 8자 이상으로 입력해 주세요.')
  })
})
