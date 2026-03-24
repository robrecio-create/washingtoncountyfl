export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const COUNTY = 'jackson';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, phone, role, verification, notes, slug } = data;

    if (!name || !email || !phone || !role || !verification || !slug) {
      return new Response(JSON.stringify({ error: 'All required fields must be filled out.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = import.meta.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up business UUID by county + slug
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, title')
      .eq('county', COUNTY)
      .eq('slug', slug)
      .single();

    if (bizError || !business) {
      console.error('Business lookup failed:', bizError?.message);
      return new Response(JSON.stringify({ error: 'Business not found. Please try again.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert claim into business_claims table
    const { error: claimError } = await supabase
      .from('business_claims')
      .insert({
        business_id: business.id,
        user_id: null, // No auth user yet — anonymous claim
        claimant_name: name,
        claimant_email: email,
        claimant_phone: phone,
        claimant_role: role,
        verification_method: verification,
        notes: notes || '',
        status: 'pending',
      });

    if (claimError) {
      console.error('Claim insert failed:', claimError.message);
      return new Response(JSON.stringify({ error: 'Failed to submit claim. Please try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Also send email notification via Resend
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const emailBody = [
        `New CLAIM REQUEST on JacksonCountyMS.com`,
        '',
        `Business: ${business.title}`,
        `Listing: /listing/${slug}/`,
        '',
        `Claimant: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Role: ${role}`,
        `Verification Method: ${verification}`,
        `Notes: ${notes || 'None'}`,
        '',
        `Review this claim in the admin dashboard:`,
        `https://gulfcoast-directory-admin.vercel.app/admin/claims`,
      ].join('\n');

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'JacksonCountyMS.com <noreply@contact.jacksoncountyms.com>',
          to: ['hello@jacksoncountyms.com'],
          subject: `New Claim Request: ${business.title} — JacksonCountyMS.com`,
          reply_to: email,
          text: emailBody,
        }),
      }).catch(err => console.error('Email notification failed:', err));
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Claim endpoint error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
