import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: collections, error } = await supabase
    .from('verse_collections')
    .select('id, name, color, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collections: collections ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, color = '#d97706', description } = await req.json() as {
    name: string; color?: string; description?: string;
  };
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { data: collection, error } = await supabase
    .from('verse_collections')
    .insert({ user_id: user.id, name: name.trim(), color, description })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collection }, { status: 201 });
}
