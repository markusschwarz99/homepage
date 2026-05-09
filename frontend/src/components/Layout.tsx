import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastProvider } from './Toast';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
