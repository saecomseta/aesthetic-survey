const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: responses, error } = await supabase.from('responses').select('*').order('submitted_at', { ascending: false }).limit(2);
  console.log("Responses:");
  console.dir(responses, { depth: null });

  if (responses && responses.length > 0) {
    const surveyId = responses[0].survey_id;
    const { data: spaces } = await supabase.from('spaces').select('*').eq('survey_id', surveyId);
    console.log("Spaces:");
    console.dir(spaces, { depth: null });

    const { data: scripts } = await supabase.from('diagnostic_scripts').select('*').eq('survey_id', surveyId);
    console.log("Scripts:");
    console.dir(scripts, { depth: null });
  }
}
check();
