import type { RouteObject } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageNotFound from "@/components/PageNotFound";
import Approval from "@/pages/Approval";
import Comments from "@/pages/Comments";
import Commercial from "@/pages/Commercial";
import Dashboard from "@/pages/Dashboard";
import MediaLibrary from "@/pages/MediaLibrary";
import Products from "@/pages/Products";
import Publications from "@/pages/Publications";
import Reports from "@/pages/Reports";
import Schedule from "@/pages/Schedule";
import Settings from "@/pages/Settings";
import VideoGeneration from "@/pages/VideoGeneration";

export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/products", element: <Products /> },
      { path: "/media", element: <MediaLibrary /> },
      { path: "/videos", element: <VideoGeneration /> },
      { path: "/approval", element: <Approval /> },
      { path: "/schedule", element: <Schedule /> },
      { path: "/publications", element: <Publications /> },
      { path: "/comments", element: <Comments /> },
      { path: "/commercial", element: <Commercial /> },
      { path: "/reports", element: <Reports /> },
      { path: "/settings", element: <Settings /> },
    ],
  },
  { path: "*", element: <PageNotFound /> },
];
