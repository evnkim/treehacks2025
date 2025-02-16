import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GitHubLoginButton from "../components/GitHubLoginButton";
import { Menu, UnstyledButton, Group, Text, Loader } from "@mantine/core";
import { IconBolt, IconDatabase, IconUsers, IconArrowRight, IconChevronDown } from "@tabler/icons-react";

const Home = () => {
  const [repositories, setRepositories] = useState([]);
  const [groupedRepos, setGroupedRepos] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [selectedRepo, setSelectedRepo] = useState(
    searchParams.get("repo") || ""
  );
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/github/repositories");
        if (response.ok) {
          const data = await response.json();
          const grouped = data.reduce((acc, repo) => {
            if (!acc[repo.owner]) {
              acc[repo.owner] = [];
            }
            acc[repo.owner].push({
              value: `${repo.owner}/${repo.name}`,
              label: `${repo.name}${repo.private ? " (Private)" : ""}`,
              description: repo.description || "No description available",
            });
            return acc;
          }, {});
          setGroupedRepos(grouped);
          setRepositories(data);
        } else if (response.status === 401) {
          setRepositories([]);
          setGroupedRepos({});
        }
      } catch (error) {
        console.error("Error fetching repositories:", error);
        setRepositories([]);
        setGroupedRepos({});
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  const handleRepoSelect = (value) => {
    setSelectedRepo(value);
    if (value) {
      navigate(`/dashboard?repo=${encodeURIComponent(value)}`, {
        replace: true,
      });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-100 overflow-hidden">
      {/* Decorative floating shapes */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-100 opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-200 opacity-50 blur-3xl" />

      {/* 1. Hero Section */}
      <header className="relative flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-400 mb-4 drop-shadow-lg">
          Rebase
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Supercharge your GitHub repositories with AI-powered insights and
          analytics
        </p>
        <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
          <GitHubLoginButton />
          <button
            className="rounded-md bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
            onClick={() => window.scrollTo({ top: 900, behavior: "smooth" })}
          >
            Learn More <IconArrowRight size={20} />
          </button>
        </div>
      </header>

      {/* Decorative wave divider */}
      <svg
        className="w-full h-32 text-white -mt-20 sm:-mt-28 md:-mt-32 lg:-mt-40 xl:-mt-48"
        viewBox="0 0 1440 320"
      >
        <path
          fill="currentColor"
          fillOpacity="1"
          d="M0,128L80,144C160,160,320,192,480,224C640,256,800,288,960,266.7C1120,245,1280,171,1360,133.3L1440,96L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
        />
      </svg>

      {/* 2. Features Section */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Why Choose Rebase?
          </h2>
          <p className="text-lg text-gray-600">
            Here’s what makes our AI-driven platform stand out
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-md">
            <IconBolt className="text-blue-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              Intelligent Insights
            </h3>
            <p className="text-gray-600 text-center">
              Leverage AI to highlight code hotspots, detect anomalies, and
              uncover new optimization opportunities.
            </p>
          </div>
          {/* Feature 2 */}
          <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-md">
            <IconDatabase className="text-blue-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              Seamless Integration
            </h3>
            <p className="text-gray-600 text-center">
              Connect with your GitHub repositories in just one click—no
              complicated setup required.
            </p>
          </div>
          {/* Feature 3 */}
          <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-md">
            <IconUsers className="text-blue-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              Team Collaboration
            </h3>
            <p className="text-gray-600 text-center">
              Share AI-generated reports with your team and keep everyone
              aligned on the latest insights.
            </p>
          </div>
        </div>
      </section>

      {/* Decorative wave divider */}
      <svg className="w-full h-32 text-blue-50" viewBox="0 0 1440 320">
        <path
          fill="currentColor"
          fillOpacity="1"
          d="M0,224L1440,32L1440,320L0,320Z"
        />
      </svg>

      {/* 3. Repository Section */}
      <section className="relative z-10 bg-gradient-to-br from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white/70 backdrop-blur-xl rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Your Repositories
              </h2>
              <p className="text-gray-600">
                Pick a repository to start diving into AI-driven analytics
              </p>
            </div>

            {Object.keys(groupedRepos).length === 0 ? (
              <div className="flex flex-col items-center">
                <p className="text-md text-gray-600 mb-8">
                  Connect your GitHub account to analyze your repositories
                </p>
                <GitHubLoginButton />
              </div>
            ) : (
              <div className="mx-auto w-full sm:w-96">
                <p className="text-md text-gray-600 mb-6 text-center">
                  Select a repository to kickstart your code insights
                </p>

                {loading ? (
                  <Loader size="sm" className="mx-auto" />
                ) : (
                  <Menu position="bottom">
                    <Menu.Target>
                      <UnstyledButton className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <Group position="center">
                          <Text className="text-gray-700">
                            {selectedRepo
                              ? selectedRepo
                              : "Select a repository"}
                          </Text>
                          <IconChevronDown size={16} />
                        </Group>
                      </UnstyledButton>
                    </Menu.Target>

                    <Menu.Dropdown
                      className="w-full"
                      style={{ maxHeight: "300px", overflowY: "auto" }}
                    >
                      {Object.entries(groupedRepos).map(([owner, repos]) => (
                        <Menu.Item key={owner} closeMenuOnClick={false}>
                          <Menu position="right">
                            <Menu.Target>
                              <UnstyledButton className="w-full text-left font-semibold p-2 rounded-md hover:bg-gray-100 transition-colors">
                                <Group position="apart">
                                  <Text className="text-gray-800">{owner}</Text>
                                  <IconChevronDown size={16} />
                                </Group>
                              </UnstyledButton>
                            </Menu.Target>
                            <Menu.Dropdown
                              style={{ maxHeight: "250px", overflowY: "auto" }}
                            >
                              {repos.map((repo) => (
                                <Menu.Item
                                  key={repo.value}
                                  onClick={() => handleRepoSelect(repo.value)}
                                >
                                  <div>
                                    <Text size="sm" weight={500}>
                                      {repo.label}
                                    </Text>
                                    <Text size="xs" color="dimmed">
                                      {repo.description}
                                    </Text>
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
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white text-center py-8">
        <p className="text-gray-600">
          {new Date().getFullYear()} Rebase. Powered by AI. Built at TreeHacks
          2025. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Home;
