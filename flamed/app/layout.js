import './globals.css';
import { Inter, Roboto } from 'next/font/google';
import { AppProvider } from './context/AppContext';
import ConditionalNavbar from './components/ConditionalNavbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const roboto = Roboto({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'Swipe App',
  description: 'Tinder-like swipe cards built with Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${roboto.variable}`} lang="en">
      <body className="flex flex-col min-h-screen antialiased">
        <AppProvider>
          <ConditionalNavbar />
          <main className="flex-grow">{children}</main>
          
          {/* Navigation buttons from your classmate's version */}
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
            }}
            onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
            onMouseLeave={(e) => e.target.style.background = "#fff"}
          >
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
            onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
            onMouseLeave={(e) => e.target.style.background = "#fff"}
          >
            Dev
          </a>
        </AppProvider>
      </body>
    </html>
  );
}