import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'
import "@rentbook/rentbook-ui-lib/microfrontend.min.css"
import Chat from './components/chat';
function App() {
  const queryClient = new QueryClient();
  return (
    <>
      <QueryClientProvider client={queryClient}>
          <Chat />
      </QueryClientProvider>
    </>
  )
}

export default App
