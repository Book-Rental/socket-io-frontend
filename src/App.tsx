import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'
import "@rentbook/rentbook-ui-lib/microfrontend.min.css"
function App() {
  const queryClient = new QueryClient();
  return (
    <>
      <QueryClientProvider client={queryClient}>
          <p>Socket.io Frontend</p>
      </QueryClientProvider>
    </>
  )
}

export default App
