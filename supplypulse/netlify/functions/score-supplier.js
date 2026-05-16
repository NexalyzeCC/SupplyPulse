// OpenAI scoring pipeline

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({ error: 'Not implemented' }),
  };
};
