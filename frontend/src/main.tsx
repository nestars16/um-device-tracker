import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Login from "@/components/pages/Login";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { CircuitDashboard } from "./components/pages/CircuitDashboard";
import { CircuitCreate } from "./components/pages/CircuitCreate";
import {
  CircuitDetail,
  singleCircuitLoader,
} from "./components/pages/CircuitDetail";
import ErrorPage from "./components/pages/ErrorPage";

export const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login role="admin" />,
    index: true,
  },
  {
    path: "/admin",
    element: <Login role="admin" />,
  },
  {
    path: "/user",
    element: <Login role="user" />,
  },
  {
    path: "circuits",
    children: [
      {
        path: "dashboard",
        element: <CircuitDashboard />,
      },
      {
        path: "create",
        element: <CircuitCreate />,
      },
      {
        path: "view/:id",
        element: <CircuitDetail />,
        loader: singleCircuitLoader,
      },
    ],
    errorElement: <ErrorPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
