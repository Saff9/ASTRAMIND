export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        AI Chat Application
      </h1>
      <p className="text-gray-600 text-center max-w-xl">
        Welcome to the AI chat application. This is the home page.
        The chat interface will be implemented at the /chat route.
      </p>
      <a
        href="/chat"
        className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Chat
      </a>
    </main>
  );
}