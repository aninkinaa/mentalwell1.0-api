const { supabase } = require('../../config/database');
const { uploadPhotoToSupabase } = require('../../config/uploadFile');
const { hashPassword } = require('../../utils/password')

const userProfile = async (userId) => {
  const { data: user, error} = await supabase
  .from('users')
  .select('id, nickname, name, email, phone_number, profile_image, birthdate, gender')
  .eq('id', userId)
  .single();

if (error || !user) throw new Error('User tidak ditemukan');
return user;
};

const editProfile = async (userId, data, photoFile) => {
  const payload = { ...data };

  const { data: currentUser, error: fetchError } = await supabase
    .from('users')
    .select('profile_image')
    .eq('id', userId)
    .single();

  if (fetchError) throw new Error(`Gagal mengambil data pengguna: ${fetchError.message}`);

  if (photoFile) {
    // Only delete old photo if a new one is being uploaded and there is an old photo
    if (currentUser.profile_image) {
      const oldFilePath = currentUser.profile_image.split('/').pop();
      const { error: deleteError } = await supabase.storage
        .from('mentalwell-bucket') 
        .remove([`profile_images/${oldFilePath}`]); 
      if (deleteError) {
        console.warn(`Gagal menghapus foto lama: ${deleteError.message}`);
      }
    }
    const uploadResult = await uploadPhotoToSupabase({file: photoFile, folder: 'profile_images', prefix: userId});
    if (!uploadResult.success) {
      throw new Error('Gagal mengunggah foto');
    }
    payload.profile_image = uploadResult.url;
  }

  if (payload.password) {
    payload.password = await hashPassword(payload.password);
  }

  const allowedFields = ['nickname', 'name', 'email', 'phone_number', 'birthdate', 'gender', 'profile_image', 'password'];
  const safePayload = {};
  for (const key of allowedFields) {
    if (payload[key] !== undefined) safePayload[key] = payload[key];
  }

  console.log('🔁 Updating user:', userId);
  console.log('✅ Payload ke Supabase:', safePayload);
  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(safePayload)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error;

  return{
    nickname: updatedUser.nickname,
    name: updatedUser.name,
    email: updatedUser.email,
    phone_number: updatedUser.phone_number,
    birthdate: updatedUser.birthdate,
    gender: updatedUser.gender,
    profile_image: updatedUser.profile_image
  }
};

module.exports = { editProfile, userProfile };
