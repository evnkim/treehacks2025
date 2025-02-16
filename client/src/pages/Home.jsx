import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GitHubLoginButton from '../components/GitHubLoginButton'
import { Select, Loader, Text, Menu, UnstyledButton, Group } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'

const Home = () => {
  const [repositories, setRepositories] = useState([])
  const [groupedRepos, setGroupedRepos] = useState({})
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
          // Group repositories by owner
          const grouped = data.reduce((acc, repo) => {
            if (!acc[repo.owner]) {
              acc[repo.owner] = []
            }
            acc[repo.owner].push({
              value: `${repo.owner}/${repo.name}`,
              label: `${repo.name}${repo.private ? ' (Private)' : ''}`,
              description: repo.description || 'No description available'
            })
            return acc
          }, {})
          setGroupedRepos(grouped)
          setRepositories(data)
        } else if (response.status === 401) {
          setRepositories([])
          setGroupedRepos({})
        }
      } catch (error) {
        console.error('Error fetching repositories:', error)
        setRepositories([])
        setGroupedRepos({})
      } finally {
        setLoading(false)
      }
    }

    fetchRepositories()
  }, [])

  const handleRepoSelect = (value) => {
    setSelectedRepo(value)
    if (value) {
      navigate(`/dashboard?repo=${encodeURIComponent(value)}`, { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Rebase</h1>
        {Object.keys(groupedRepos).length === 0 ? (
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
              <Menu position="bottom">
                <Menu.Target>
                  <UnstyledButton className="w-full p-3 border rounded-lg hover:bg-gray-50">
                    <Group position="center">
                      <Text className="text-center">
                        {selectedRepo ? selectedRepo : 'Select a repository'}
                      </Text>
                      <IconChevronDown size={16} />
                    </Group>
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown className="w-full" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {Object.entries(groupedRepos).map(([owner, repos]) => (
                    <Menu.Item 
                      key={owner}
                      closeMenuOnClick={false}
                    >
                      <Menu position="right">
                        <Menu.Target>
                          <UnstyledButton className="w-full text-left font-semibold">
                            <Group position="apart">
                              <Text>{owner}</Text>
                              <IconChevronDown size={16} />
                            </Group>
                          </UnstyledButton>
                        </Menu.Target>
                        <Menu.Dropdown style={{ maxHeight: '250px', overflow: 'auto' }}>
                          {repos.map((repo) => (
                            <Menu.Item 
                              key={repo.value}
                              onClick={() => handleRepoSelect(repo.value)}
                            >
                              <div>
                                <Text size="sm" weight={500}>{repo.label}</Text>
                                <Text size="xs" color="dimmed">{repo.description}</Text>
                              </div>
                            </Menu.Item>
                          ))}
                        </Menu.Dropdown>
                      </Menu>
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
