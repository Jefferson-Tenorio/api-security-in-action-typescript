import { useNavigate } from 'react-router-dom'

export function Login() {
    const navigate = useNavigate()

    return (
        <div className= "flex w-255 h-screen">
            <div className="bg-[#1A1D1E] w-200 flex flex-col gap-4 px-4 py-4">
                    <p style={{ fontFamily: "IosevkaCharon" }} className="text-white text-3xl flex-1 flex items-center justify-center">
                        Natter
                    </p>
                    <div className="text-white self-start">
                         Need an account?
                        <button className="p-1 underline" onClick={()=>navigate('/register')}>
                            Sign up now
                        </button>   
                    </div>
            </div>  
            <div className="  flex items-center justify-center bg-[#F5F5F5] h-screen">

                            <div className= " px-3.5 py-3.5 flex flex-col w-120 gap-7 ">

                                <div className = "flex items-center justify-center font-semibold text-2xl">Sign In</div>

                                <div className="flex flex-col font-thin gap-5">
                                    <div className="flex flex-col gap-1.5 text-gray-400">
                                        USERNAME OR EMAIL
                                        <input className="bg-gray-300 focus:outline-none px-1 py-0.5 text-black"></input>
                                    </div> 
                                    <div className="flex flex-col gap-1.5 text-gray-400">
                                        PASSWORD
                                        <input type="password" className="bg-gray-300 focus:outline-none px-1 py-0.5 text-black"></input>
                                    </div>
                                </div>

                                <div>
                                    Access your account to continue where you left off and manage your saved preferences.
                                </div>

                                <button className="bg-gray-900 text-amber-50 rounded-3xl h-9    ">
                                    Sign In
                                </button>
                        </div>
            </div>
        </div>
    )
}
