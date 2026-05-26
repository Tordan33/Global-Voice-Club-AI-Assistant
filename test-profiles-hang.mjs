import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqypxsarxehfgtslyzoy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeXB4c2FyeGVoZmd0c2x5em95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDk0MTIsImV4cCI6MjA3OTMyNTQxMn0.ejwhSuKBlNxyg2dk761vW9e1uNFRgoZGxcj2ogggS-4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching profiles...');
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log('Profiles fetch result:', { data, error });
  } catch (e) {
    console.error('Profiles error:', e);
  }
}
test();
