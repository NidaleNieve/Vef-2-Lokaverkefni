import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Gastroswipe",
  description: "Find the perfect restaurant for your group!",
  icons: {
    icon: [
      { url: "/logo_720.png", type: "image/png", sizes: "any" },
      { url: "/logo_48x48.png", type: "image/png", sizes: "48x48" },
    ],
    shortcut: [
      { url: "/logo_48x48.png", type: "image/png", sizes: "48x48" },
    ],
    apple: [
      { url: "/logo_720.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body
        suppressHydrationWarning
        className="antialiased"
        style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}
      >
        <Navbar />
        <div style={{ height: "64px" }} />
        {children}

        {/*Old developer buttons}
        <a
          href="/"
          style={{
            position: "fixed",
            top: "1rem",
            right: "6rem",
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "6px",
            padding: "0.5rem 1rem",
            fontWeight: 500,
            textDecoration: "none",
            color: "#222",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            transition: "background 0.2s"
          }}>
          Swipe
        </a>
      
        <a
          href="/dev"
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "6px",
            padding: "0.5rem 1rem",
            fontWeight: 500,
            textDecoration: "none",
            color: "#222",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            transition: "background 0.2s"
          }}
        >
          Dev
        </a>
        */}
      </body>
    </html>
  );
}