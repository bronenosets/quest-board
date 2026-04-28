"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastHost } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5_000, refetchOnWindowFocus: true },
    },
  }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <ToastHost />
    </QueryClientProvider>
  );
}
