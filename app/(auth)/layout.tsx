import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-stone-800">Scripture Stream</h1>
          <p className="text-stone-500 mt-1">Your daily Bible companion</p>
        </div>
        {children}
      </div>
    </div>
  );
}
