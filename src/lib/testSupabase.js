import { supabase } from './supabase'

export async function testSupabase() {
  const { data, error } = await supabase
    .from('connection_test')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Supabase connection failed:', error.message)
  } else {
    console.log('Supabase connected successfully!', data)
  }
}