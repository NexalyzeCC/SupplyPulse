const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const method = event.httpMethod;

  // GET — list all suppliers for a user
  if (method === 'GET') {
    const userId = event.queryStringParameters?.userId;
    const { data, error } = await supabase
      .from('suppliers')
      .select('*, scores(score, risk, scored_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  }

  // POST — add a new supplier
  if (method === 'POST') {
    const { name, country, category, userId } = JSON.parse(event.body);
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ name, country, category, user_id: userId })
      .select()
      .single();

    return {
      statusCode: 201,
      body: JSON.stringify(data)
    };
  }

  // DELETE — remove a supplier
  if (method === 'DELETE') {
    const { supplierId } = JSON.parse(event.body);
    await supabase.from('suppliers').delete().eq('id', supplierId);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
};