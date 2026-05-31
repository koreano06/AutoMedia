import type { RouteObject } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageNotFound from "@/components/PageNotFound";
import RequirePermission from "@/components/auth/RequirePermission";
import Approval from "@/pages/Approval";
import Comments from "@/pages/Comments";
import Commercial from "@/pages/Commercial";
import Dashboard from "@/pages/Dashboard";
import ERPManagement from "@/pages/ERPManagement";
import Integrations from "@/pages/Integrations";
import MediaLibrary from "@/pages/MediaLibrary";
import MarketplaceAds from "@/pages/MarketplaceAds";
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
      { path: "/erp", element: <RequirePermission permission="finance:manage"><ERPManagement /></RequirePermission> },
      { path: "/products", element: <Products /> },
      { path: "/marketplace-ads", element: <RequirePermission permission="platform:manage"><MarketplaceAds /></RequirePermission> },
      { path: "/media", element: <MediaLibrary /> },
      { path: "/videos", element: <VideoGeneration /> },
      { path: "/approval", element: <Approval /> },
      { path: "/schedule", element: <Schedule /> },
      { path: "/publications", element: <Publications /> },
      { path: "/comments", element: <Comments /> },
      { path: "/integrations", element: <RequirePermission permission="platform:manage"><Integrations /></RequirePermission> },
      { path: "/commercial", element: <RequirePermission permission="finance:manage"><Commercial /></RequirePermission> },
      { path: "/reports", element: <Reports /> },
      { path: "/settings", element: <RequirePermission permission="settings:manage"><Settings /></RequirePermission> },
    ],
  },
  { path: "*", element: <PageNotFound /> },
];
