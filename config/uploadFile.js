const { supabase } = require('./database');
const { nanoid } = require('nanoid');
const path = require('path');
const { ValidationError } = require('../utils/errors');

const uploadPhotoToSupabase = async ({ file, folder = 'profile_images', prefix = '' }) => {
  if (!file?.hapi?.filename || !file?._data) {
    throw new ValidationError('File tidak valid. Silakan unggah ulang.');
  }

  const contentType = file.hapi.headers['content-type'];
  const allowedMimeTypes = ['image/jpeg', 'image/png'];

  if (!allowedMimeTypes.includes(contentType)) {
    throw new ValidationError('Format file tidak didukung. Silakan unggah JPG atau PNG');
  }

  const fileExt = path.extname(file.hapi.filename);
  const randomString = nanoid(4);
  const fileName = `${prefix}${prefix ? '-' : ''}${randomString}${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('mentalwell-bucket')
    .upload(filePath, file._data, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Gagal upload foto: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from('mentalwell-bucket')
    .getPublicUrl(filePath);

  return {
    success: true,
    url: data.publicUrl,
  };
};

  

module.exports = { uploadPhotoToSupabase };
