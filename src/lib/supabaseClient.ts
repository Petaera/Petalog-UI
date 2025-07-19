import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://poqzxjhsdbwfnooftiwe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcXp4amhzZGJ3Zm5vb2Z0aXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MjI2MTMsImV4cCI6MjA2ODM5ODYxM30.qKLnvcnUBB1PBvUZ_p7Es0NOLjK2ixkMyeaF57C6yVA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 