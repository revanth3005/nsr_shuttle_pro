import "./globals.css";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/ui/toast";

export const metadata = {
  title: "ShuttlePro — NSRN",
  description:
    "Production-ready badminton tournament management: players, clubs, tournaments, fixtures, rankings and leaderboards — powered by an Excel data store.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <ToastProvider>{children}</ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
