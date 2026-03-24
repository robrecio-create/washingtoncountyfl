export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const COUNTY = 'jackson';

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = import.meta.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ photos: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up business by county + slug
    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .ilike('county', COUNTY)
      .eq('slug', slug)
      .single();

    if (!biz) {
      return new Response(JSON.stringify({ photos: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch photos
    const { data: photos } = await supabase
      .from('business_photos')
      .select('url, alt_text, is_primary, sort_order')
      .eq('business_id', biz.id)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true });

    return new Response(JSON.stringify({ photos: photos || [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ photos: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
