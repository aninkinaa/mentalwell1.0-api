const { createArticle, editArticle, removearticle } = require('../../services/administrators/article');
const { articleSchema, updateArticleSchema } = require('../../utils/validation')

const postArticle = async (request, h) => {
    try{
        const payload = {...request.payload}
        const file = payload.image._data? payload.image : null;

        const allowedFields = [ 'title', 'content', 'references', 'categories' ];
        const plainPayload = {}

        for (const key of allowedFields){
            if (payload[key] !== undefined )
                plainPayload[key] = payload[key]
        }

        if (typeof plainPayload.categories === 'string') {
        try {
          const parsed = JSON.parse(plainPayload.categories);
          plainPayload.categories = Array.isArray(parsed) ? parsed.map(Number) : [Number(parsed)];
        } catch (e) {
          return h.response({
            status: 'fail',
            message: 'Format kategori tidak valid. Gunakan array angka seperti [1, 2]'
          }).code(400);
        }
      }

      const { error } = articleSchema.validate(plainPayload)
      if (error) {
        return h.response({
          status: 'fail',
          message: error.details[0].message
        }).code(400);
      }

        const postedArticle = await createArticle(plainPayload, file)

        return h.response({
            status: 'success',
            message: 'Artikel berhasil dibuat',
            data: postedArticle
        }).code(200);

    } catch (err){
        return h.response({
            status: 'fail',
            message: 'Gagal membuat artikel'
        }).code(500);
    }
}

const updateArticle = async (request, h) => {
    try {
      const articleId = request.params.id;
      const payload = { ...request.payload };
      const file = payload.image?._data ? payload.image : null;
  
      const allowedFields = ['title', 'content', 'references'];
      const plainPayload = {};
      for (const key of allowedFields) {
        if (payload[key] !== undefined)
            plainPayload[key] = payload[key];
      }
  
      const { error } = updateArticleSchema.validate(plainPayload);
      if (error) {
        return h.response({
          status: 'fail',
          message: error.details[0].message,
        }).code(400);
      }
  
      const updated = await editArticle(articleId, plainPayload, file);
  
      return h.response({
        status: 'success',
        message: 'Artikel berhasil diperbarui',
        data: updated,
      }).code(200);
    } catch (err) {
      console.error('❌ updateArticle error:', err.message);
      return h.response({
        status: 'fail',
        message: 'Gagal memperbarui artikel',
      }).code(500);
    }
  };

const deleteArticle = async (request, h) => {
  try {
    const { id } = request.params;
    const result = await removearticle(id);
    return h.response({
      status: 'success',
      message: result.message
    }).code(200);
  } catch (err) {
    console.error('❌ deleteArticle error:', err);
    const statusCode = err instanceof ClientError ? err.statusCode : 500;
    const message = err instanceof ClientError ? err.message : 'Terjadi kesalahan pada server.';
    return h.response({
      status: 'fail',
      message
    }).code(statusCode);
  }
};
module.exports = { postArticle, updateArticle, deleteArticle };