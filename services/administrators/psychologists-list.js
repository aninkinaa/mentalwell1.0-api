const { supabase } = require('../../config/database');

const allPsychologists = async () => {
  const { data, error } = await supabase
    .from('psychologists')
    .select(`
      id,
      bio,
      experience,
      price,
      availability,
      users (
        id,
        name,
        nickname,
        email,
        phone_number,
        gender,
        birthdate,
        profile_image
      )
    `)
    .eq('users.is_active', true)
    .order('name', { referencedTable: 'users', ascending: true });

  if (error) {
    throw new Error('Gagal mengambil data psikolog: ' + error.message);
  }

  return data.map(ps => ({
    id: ps.id,
    name: ps.users?.name || '-',
    nickname: ps.users?.nickname || '-',
    email: ps.users?.email || '-',
    phone_number: ps.users?.phone_number || '-',
    gender: ps.users?.gender || '-',
    birthdate: ps.users?.birthdate || '-',
    profile_image: ps.users?.profile_image || null,
    bio: ps.bio,
    experience: ps.experience,
    price: ps.price,
    availability: ps.availability
  }));
};

const deleteAPsychologist = async (psychologistId) => {

  const { data: psy, error: userError } = await supabase
    .from('psychologists')
    .select('user_id')
    .eq('id', psychologistId)
    .single();

  if (userError || !psy) {
    throw new Error('Gagal mendapatkan ID pengguna psikolog: ' + (userError?.message || 'Tidak ditemukan'));
  }

  const userId = psy.user_id;

  await supabase.from('psychologists_topics').delete().eq('psychologist_id', psychologistId);
  await supabase.from('psychologist_weekly_availabilities').delete().eq('psychologist_id', psychologistId);
  await supabase.from('psychologist_schedules').delete().eq('psychologist_id', psychologistId);

  const { error: deactivateError } = await supabase
    .from('users')
    .update({ is_active: false,
      email: null,
      phone_number: null,
     })
    .eq('id', userId);

  if (deactivateError) {
    throw new Error('Gagal menonaktifkan akun psikolog: ' + deactivateError.message);
  }

  return { message: 'Psikolog berhasil dinonaktifkan dan data jadwal/topik dihapus' };
};



const deleteMultiplePsychologists = async (psychologistIds) => {
  if (!Array.isArray(psychologistIds) || psychologistIds.length === 0) {
    throw new Error('ID psikolog tidak valid');
  }

  const { data: userIds, error: userError } = await supabase
    .from('psychologists')
    .select('user_id')
    .in('id', psychologistIds);

  if (userError) {
    throw new Error('Gagal mendapatkan ID pengguna psikolog: ' + userError.message);
  }

  cons



}



 

module.exports = { allPsychologists, deleteAPsychologist };
