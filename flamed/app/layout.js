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
        </AppProvider>
      </body>
    </html>
  );
}