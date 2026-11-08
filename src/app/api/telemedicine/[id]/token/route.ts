import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { requireAuth } from '@/lib/auth/guards';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity: user.id, name: user.name || 'User', ttl: '2h' }
    );
    
    at.addGrant({ 
      roomJoin: true, 
      room: id, 
      canPublish: true, 
      canSubscribe: true 
    });
    
    return NextResponse.json({ token: await at.toJwt() });
  } catch (error) {
    console.error('Token Error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
