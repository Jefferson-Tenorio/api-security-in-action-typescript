import { useNavigate } from 'react-router-dom'

export function Home() {
    const navigate = useNavigate()
    
    return (
        <div>
                <h1>Home Page</h1>
                <button onClick={() => navigate('/login')}>
                    Login
                </button>
                <button onClick={() => navigate('/register')}>
                    register
                </button>

        </div>
    )
}