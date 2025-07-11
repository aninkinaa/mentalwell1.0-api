const { supabase } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

const allArticles = async () => {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      articles_categories (
        category_id,
        categories (
          id,
          category
        )
      )
    `);

  if (error) {
    throw new Error(`Supabase error (allArticles): ${error.message}`);
  }

  if (!data) {
    throw new NotFoundError('Artikel tidak ditemukan.');
  }

  const formatted = (data || []).map(article => ({
    id: article.id,
    title: article.title,
    content: article.content,
    references: article.references,
    image: article.image || null,
    categories: (article.articles_categories || [])
      .filter(c => c.categories !== null)
      .map(c => ({
        id: c.categories.id,
        name: c.categories.category
      })),
    created_at: article.created_at
  }));

  return formatted;
};


const selectArticle = async (id) => {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      articles_categories (
        category_id,
        categories (
          id,
          category
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new NotFoundError('Artikel tidak ditemukan.');
  }

  const formatted = {
    id: data.id,
    title: data.title,
    content: data.content,
    references: data.references,
    image: data.image || null,
    categories: (data.articles_categories || [])
      .filter(c => c.categories !== null)
      .map(c => ({
        id: c.categories.id,
        name: c.categories.category
      })),
    created_at: data.created_at
  };

  return formatted;
};

const searchArticle = async (keyword) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*');

  if (error) {
    throw new Error(`Supabase error (searchArticle): ${error.message}`);
  }

  if (!keyword) return [];

  const keywords = keyword.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  const filtered = data.filter((d) =>
    keywords.some(k => d.title.toLowerCase().includes(k))
  );

  return filtered;
};

module.exports = { allArticles, selectArticle, searchArticle };
