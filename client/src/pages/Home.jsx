import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GitHubLoginButton from '../components/GitHubLoginButton'
import { Select, Loader, Text } from '@mantine/core'

const Home = () => {
  const [repositories, setRepositories] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const [selectedRepo, setSelectedRepo] = useState(searchParams.get('repo') || '')
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is authenticated and fetch their repositories
    const fetchRepositories = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/github/repositories')
        if (response.ok) {
          const data = await response.json()
          // Map repositories to format expected by Select component
          setRepositories(data.map(repo => ({
            value: `${repo.owner}/${repo.name}`,
            label: `${repo.full_name}${repo.private ? ' (Private)' : ''}`,
            description: repo.description || 'No description available'
          })))
        } else if (response.status === 401) {
          // User not authenticated
          setRepositories([])
        }
      } catch (error) {
        console.error('Error fetching repositories:', error)
        setRepositories([])
      } finally {
        setLoading(false)
      }
    }

    fetchRepositories()
  }, [])

  const handleRepoSelect = (value) => {
    setSelectedRepo(value)
    if (value) {
      // Navigate to dashboard with selected repository
      navigate(`/dashboard?repo=${encodeURIComponent(value)}`, { replace: true })
    } else {
      // Clear repo from URL if none selected
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Rebase</h1>
        {repositories.length === 0 ? (
          <>
            <div className="flex flex-col items-center">
              <p className="text-lg text-gray-600 mb-8">
                Connect your GitHub account to analyze your repositories
              </p>
              <GitHubLoginButton />
            </div>
          </>
        ) : (
          <div className="w-96">
            <p className="text-lg text-gray-600 mb-8">
              Select a repository to analyze its code and contributions
            </p>
            {loading ? (
              <Loader size="sm" className="mx-auto" />
            ) : (
              <Select
                data={repositories}
                value={selectedRepo}
                onChange={handleRepoSelect}
                placeholder="Choose a repository"
                searchable
                clearable
                maxDropdownHeight={400}
                nothingFound="No repositories found"
                itemComponent={({ label, description }) => (
                  <div>
                    <Text size="sm" weight={500}>{label}</Text>
                    <Text size="xs" color="dimmed">{description}</Text>
                  </div>
                )}
                className="w-full"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
