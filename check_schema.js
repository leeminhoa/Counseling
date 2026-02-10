
const { createClient } = require('@supabase/supabase-js');

const url = 'https://ytpycfenjtmvzjsvjwds.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cHljZmVuanRtdnpqc3Zqd2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzAxMTgsImV4cCI6MjA4NTI0NjExOH0.-k0r-Ct3mof9I0iQHOiCptgCkiiVXksgH2q3Be79620';
const supabase = createClient(url, key);

async function inspect() {
    console.log('--- Tables ---');
    // This might not work with anon key if permissions deny table listing, but let's try reading a single row

    console.log('--- univ_dept_subjects_map ---');
    const { data: mapData, error: mapError } = await supabase.from('univ_dept_subjects_map').select('*').limit(1);
    console.log(mapData, mapError);

    console.log('--- v_univ_dept_subjects ---');
    const { data: viewData, error: viewError } = await supabase.from('v_univ_dept_subjects').select('*').limit(1);
    console.log(viewData, viewError);

    console.log('--- subjects ---');
    const { data: subData, error: subError } = await supabase.from('subjects').select('*').limit(1);
    console.log(subData, subError);
}

inspect();
