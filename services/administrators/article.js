const { supabase } = require('../../config/database')
const { uploadPhotoToSupabase } = require('../../config/uploadFile')

const createArticle = async (data, file) => {
  const { categories, ...rest } = data;
  let payload = { ...rest };

  if (file) {
    const uploadResult = await uploadPhotoToSupabase({ file, folder: 'articles' });
    if (!uploadResult.success) {
      throw new Error('Gagal mengunggah gambar');
    }
    payload.image = uploadResult.url;
  }

  const { data: inserted, error } = await supabase
    .from('articles')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error('Gagal membuat artikel: ' + error.message);
  }

  if (Array.isArray(categories) && categories.length > 0) {
    const relationData = categories.map(category_id => ({
      article_id: inserted.id,
      category_id
    }));

    const { error: relationError } = await supabase
      .from('articles_categories')
      .insert(relationData);

    if (relationError) {
      throw new Error('Artikel berhasil dibuat, tapi gagal menyimpan kategori: ' + relationError.message);
    }
  }

  const { data: categoryList, error: catError } = await supabase
    .from('articles_categories')
    .select('categories(id, category)')
    .eq('article_id', inserted.id);

  if (catError) {
    throw new Error('Artikel berhasil dibuat, tapi gagal mengambil kategori: ' + catError.message);
  }

  return {
    ...inserted,
    categories: categoryList.map(c => ({
      id: c.categories.id,
      name: c.categories.category,
    })),
  };
};


const editArticle = async (id, data, file) => {
  const { categories, ...rest } = data;
  const payload = { ...rest };

  if (file) {
    const uploadResult = await uploadPhotoToSupabase({ file, folder: 'articles' });
    if (!uploadResult.success) {
      throw new Error('Gagal upload gambar');
    }
    payload.image = uploadResult.url;
  }

  const { data: updated, error } = await supabase
    .from('articles')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error('Gagal memperbarui artikel: ' + error.message);
  }

  if (Array.isArray(categories)) {
    // Hapus relasi lama
    const { error: deleteError } = await supabase
      .from('articles_categories')
      .delete()
      .eq('article_id', id);

    if (deleteError) {
      throw new Error('Gagal menghapus kategori lama: ' + deleteError.message);
    }

    if (categories.length > 0) {
      const relationData = categories.map(category_id => ({
        article_id: id,
        category_id
      }));

      const { error: insertError } = await supabase
        .from('articles_categories')
        .insert(relationData);

      if (insertError) {
        throw new Error('Gagal menyimpan kategori baru: ' + insertError.message);
      }
    }
  }

  const { data: finalCategories, error: fetchCatError } = await supabase
  .from('articles_categories')
  .select('category_id')
  .eq('article_id', id);

  if (fetchCatError) {
    throw new Error('Gagal mengambil kategori terbaru: ' + fetchCatError.message);
  }

  return {
    ...updated,
    categories: finalCategories?.map(c => c.category_id) || []
  };
};


const removearticle = async (id) => {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) {
    throw new NotFoundError('Artikel tidak ditemukan.');
  }

  return { message: 'Artikel berhasil dihapus.' };
};
module.exports = { createArticle, editArticle, removearticle }