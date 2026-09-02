import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { Provider } from "react-redux";
import { store } from "./store/store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});


ReactDOM.createRoot( document.getElementById("root")!).render(
  <React.StrictMode>
      <QueryClientProvider client={queryClient} >
          <Provider store={store}>
            <App />
          </Provider>
      </QueryClientProvider>
  </React.StrictMode>
);