import { FaGithub } from "react-icons/fa";

const GitHubLoginButton = () => {
  const handleLogin = () => {
    // This will redirect to our Flask backend's GitHub OAuth route
    window.location.href = "/api/auth/login";
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 px-6 py-3 text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
    >
      <FaGithub className="w-5 h-5" />
      <span>Sign in with GitHub</span>
    </button>
  );
};

export default GitHubLoginButton;
