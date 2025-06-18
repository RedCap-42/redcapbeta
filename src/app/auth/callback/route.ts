import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Échange le code contre une session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Rediriger vers le tableau de bord après confirmation d'email
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
