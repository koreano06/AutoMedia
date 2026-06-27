import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { queryClientInstance } from "@/lib/queryClient";

type AppProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <BrowserRouter>{children}</BrowserRouter>
          <Toaster />
          <SonnerToaster richColors position="top-right" closeButton />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
