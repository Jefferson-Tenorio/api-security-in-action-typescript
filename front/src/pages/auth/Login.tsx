import { useNavigate } from 'react-router-dom'

export function Login() {
    const navigate = useNavigate()

    return (
        <div>
                  <h1>Login</h1>
                    <button onClick={() => navigate('/register')}>
                    Não tem conta? Cadastre-se
                    </button>
        </div>
    )
}
