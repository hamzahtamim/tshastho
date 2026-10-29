import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // DEVELOPMENT FALLBACK: Bypasses Supabase if using dummy credentials
    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('dummy')) {
      console.log('[UPLOAD] Using real placeholder image for development.');
      // Returns a professional doctor image from Unsplash
      return NextResponse.json({ 
        url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=256&auto=format&fit=crop" 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('tshastho_uploadsdrpp')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ 
        url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=256&auto=format&fit=crop" 
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('tshastho_uploadsdrpp')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrlData.publicUrl });

  } catch (error) {
    console.error('[UPLOAD_ERROR]', error);
    return NextResponse.json({ 
      url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=256&auto=format&fit=crop" 
    });
  }
}
