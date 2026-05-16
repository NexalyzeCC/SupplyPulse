const { schedule } = require('@netlify/functions');

const handler = async () => {
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, country, category');

  // Re-score each supplier
  for (const supplier of suppliers) {
    await fetch(`${process.env.URL}/.netlify/functions/score-supplier`, {
      method: 'POST',
      body: JSON.stringify({
        supplierId: supplier.id,
        supplierName: supplier.name,
        country: supplier.country,
        category: supplier.category
      })
    });
  }
};

exports.handler = schedule('0 6 * * *', handler);