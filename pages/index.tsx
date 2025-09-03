import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to new enhanced dashboard
    router.push('/dashboard')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Alumni Dashboard V2</h1>
        <p className="text-gray-600 mt-2">Redirecionando para o dashboard...</p>
      </div>
    </div>
  )
}