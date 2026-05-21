import { useNavigate } from 'react-router-dom'

export function Register() {
  const navigate = useNavigate()

  return (
    <div>
      <h1>Cadastro</h1>
      <button onClick={() => navigate('/login')}>
        Já tem conta? Faça login
      </button>
    </div>
  )
}