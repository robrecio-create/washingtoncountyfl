import { createClient } from '@supabase/supabase-js';
import businessDataFallback from '../data/businesses.json';

export async function getWashingtonBusinesses(): Promise<any[]> {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return businessDataFallback as any[];
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('businesses')
      .select('id, legacy_id, title, slug, status, content, excerpt, address, phone, email, website, featured, listing_tier, categories, location, tags, deal_title, deal_description, deal_expiry, latitude, longitude, vanity_url')
      .ilike('county', 'washington')
      .ilike('status', 'publish%')
      .order('featured', { ascending: false })
      .order('title', { ascending: true });

    if (error || !data || data.length === 0) {
      return businessDataFallback as any[];
    }

    return data;
  } catch {
    return businessDataFallback as any[];
  }
}
