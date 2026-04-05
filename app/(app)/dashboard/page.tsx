import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user!.id).single();

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-serif text-stone-800 mb-2">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
      </h1>
      <p className="text-stone-500">Continue your Bible study journey.</p>
      <a href="/read/john/3" className="mt-6 inline-block bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 transition">
        Open Bible Reader →
      </a>
    </main>
  );
}
