const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ytpycfenjtmvzjsvjwds.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cHljZmVuanRtdnpqc3Zqd2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzAxMTgsImV4cCI6MjA4NTI0NjExOH0.-k0r-Ct3mof9I0iQHOiCptgCkiiVXksgH2q3Be79620';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('subject_info').select('*').limit(1);
  console.log("Subject Info:", { data, error });
  
  const { data: majorData, error: majorError } = await supabase.from('v_univ_dept_subjects').select('*').limit(1);
  console.log("Major Map Info:", { majorData, majorError });
}
run();
