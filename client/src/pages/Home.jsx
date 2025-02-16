import GitHubLoginButton from '../components/GitHubLoginButton'

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Rebase</h1>
        <p className="text-lg text-gray-600 mb-8">Connect your GitHub account to get started</p>
        <GitHubLoginButton />
      </div>
    </div>
  )
}

export default Home
