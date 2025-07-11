const { supabase } = require('../../config/database')
const { uploadPhotoToSupabase } = require('../../config/uploadFile')

const createArticle = async (data, file) => {
    const { categories, ...rest } = data;
    let payload = { ...rest };

    if (file) {
        const uploadResult = await uploadPhotoToSupabase({ file: file, folder: 'articles' });
        if (!uploadResult.success) {
            throw Error('Gagal mengunggah gambar');
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

    return inserted;
}


const editArticle = async (id, data, file) => {
    const payload = { ...data };
  
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
      .single();
  
    if (error) 
        throw new Error('Gagal memperbarui artikel: ' + error.message);
  
    return updated;
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