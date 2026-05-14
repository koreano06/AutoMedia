import { useRoutes } from "react-router-dom";
import { Zap } from "lucide-react";
import AuthPage from "@/pages/AuthPage";
import { useAuth } from "@/lib/AuthContext";
import { appRoutes } from "@/app/routes";

function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <Zap className="h-5 w-5 text-white" fill="white" />
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    </div>
  );
}

export default function AppRouter() {
  const routes = useRoutes(appRoutes);
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return routes;
}
