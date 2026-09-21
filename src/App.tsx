import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Deposit } from "@/pages/Deposit";
import { Explore } from "@/pages/Explore";
import { Landing } from "@/pages/Landing";
import { Launch } from "@/pages/Launch";
import { Portfolio } from "@/pages/Portfolio";
import { TokenDetail } from "@/pages/TokenDetail";
import { SolanaWalletProviders } from "@/services/walletService";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProviders>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/token/:mint" element={<TokenDetail />} />
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="bottom-right" richColors />
      </SolanaWalletProviders>
    </QueryClientProvider>
  );
}
