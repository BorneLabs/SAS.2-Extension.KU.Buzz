// supabase-config.js
const supabaseUrl = "https://zobmevhwmacbmierdlca.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvYm1ldmh3bWFjYm1pZXJkbGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3OTM5NDQsImV4cCI6MjA1NzM2OTk0NH0.lQShmiQpwltjH-ZmCiJENvczpWr8WqhifJm3TUyG9sY";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

export default supabaseClient;
