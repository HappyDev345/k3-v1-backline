// Finds the existing 1:1 conversation between two users, or creates one.
export async function findOrCreateConversation(supabase, meId, otherId) {
  const { data: mine } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', meId)

  const ids = (mine || []).map(r => r.conversation_id)
  if (ids.length) {
    const { data: shared } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .in('conversation_id', ids)
      .eq('user_id', otherId)
    if (shared && shared.length) return shared[0].conversation_id
  }

  const { data: conv, error } = await supabase.from('conversations').insert({}).select().single()
  if (error) throw error
  const { error: memErr } = await supabase.from('conversation_members').insert([
    { conversation_id: conv.id, user_id: meId },
    { conversation_id: conv.id, user_id: otherId },
  ])
  if (memErr) throw memErr
  return conv.id
}
