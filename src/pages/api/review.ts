export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const COUNTY = 'jackson';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { slug, name, rating, text } = data;

    if (!slug || !name || !rating) {
      return new Response(JSON.stringify({ error: 'Name, rating, and business are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up business UUID by county + slug
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select('id, featured')
      .eq('county', COUNTY)
      .eq('slug', slug)
      .single();

    if (bizError || !biz) {
      return new Response(JSON.stringify({ error: 'Business not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only featured businesses accept reviews
    if (!biz.featured) {
      return new Response(JSON.stringify({ error: 'Reviews are only available for featured businesses.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert review with pending status
    const { error: insertError } = await supabase
      .from('business_reviews')
      .insert({
        business_id: biz.id,
        reviewer_name: name.trim(),
        rating: ratingNum,
        review_text: (text || '').trim(),
        status: 'pending',
      });

    if (insertError) {
      console.error('Review insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to submit review.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Review API error:', err);
    return new Response(JSON.stringify({ error: 'Server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
