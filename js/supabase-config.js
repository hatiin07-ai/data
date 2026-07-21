const SUPABASE_URL = 'https://fwlkyyvrkunqqtyttilp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bGt5eXZya3VucXF0eXR0aWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTIyODcsImV4cCI6MjEwMDE4ODI4N30.bFTQVch4TYCxXAWvtTcWdLA4B4HeyAeepqLjZ2daJWI';

let _sb = null;
function initSupabase(){
  if(_sb) return _sb;
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}
