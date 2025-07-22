const { supabase } = require('../../config/database');
const { uploadPhotoToSupabase } = require('../../config/uploadFile');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);


const psychologistProfile = async (psychologistId) => {
  const { data: user, error: userError } = await supabase
    .from('psychologists')
    .select(`
      id, bio, experience, price, availability,
      users (
        id, name, nickname, email, phone_number, birthdate,
        profile_image
      ),
      psychologists_topics (
        topic_id, topics ( id, name )
      ),
      psychologist_weekly_availabilities (
        id, day, start_time, end_time
      ),
      psychologist_schedules (
        id, date, start_time, end_time
      )
    `)
    .eq('user_id', psychologistId)
    .single();
  if (userError) {
    throw new Error('Gagal mengambil detail psikolog: ' + userError.message);
  }
  if (!user) {
    throw new Error('Psikolog tidak ditemukan');
  }
  const topics = user.psychologists_topics.map(t => t.topics);
  const weeklySchedules = user.psychologist_weekly_availabilities.map(s => ({
    id: s.id,
    day: s.day,
    start_time: s.start_time,
    end_time: s.end_time
  })); 
  const customSchedules = user.psychologist_schedules.map(s => ({
    id: s.id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time
  }));
  return {
    id: user.id,
    name: user.users.name,
    nickname: user.users.nickname,
    email: user.users.email,
    phone_number: user.users.phone_number,
    birthdate: user.users.birthdate,
    profile_image: user.users.profile_image,
    bio: user.bio,
    experience: user.experience,
    price: user.price,
    availability: user.availability,
    topics,
    schedules: [...(weeklySchedules || []),
    ...(customSchedules || [])]
      
    }
  };


const editPsychologistProfile = async (userId, data, photoFile) => {
  // Cek apakah ada foto yang diupload dan lakukan upload ke Supabase
  if (photoFile) {
    const upload = await uploadPhotoToSupabase({
      file: photoFile,
      folder: 'profile_images',
      prefix: userId,
    });
    if (!upload.success) throw new Error('Upload foto gagal');
    data.profile_image = upload.url;
  }

  // Ambil data user yang ada di database
  const { data: existingUser, error: userFetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userFetchError || !existingUser) throw new Error('User tidak ditemukan');

  // Ambil data psikolog yang ada di database
  const { data: existingPsychologist, error: psyFetchError } = await supabase
    .from('psychologists')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (psyFetchError || !existingPsychologist) throw new Error('Data psikolog tidak ditemukan');

  // Update data user
  const allowedUserFields = ['name', 'nickname', 'phone_number', 'email', 'birthdate', 'gender', 'profile_image'];
  const userData = {};

  allowedUserFields.forEach((key) => {
    // Gunakan nilai baru jika ada, jika tidak ada gunakan nilai lama dari existingUser
    userData[key] = data[key] !== undefined ? data[key] : existingUser[key];
  });

  const { data: updatedUser, error: userUpdateError } = await supabase
    .from('users')
    .update(userData)
    .eq('id', userId)
    .select()
    .single();

  if (userUpdateError) throw new Error('Gagal update data user');

  // Update data psikolog
  const allowedPsyFields = ['bio', 'experience'];
  const psyData = {};

  allowedPsyFields.forEach((key) => {
    // Gunakan nilai baru jika ada, jika tidak ada gunakan nilai lama dari existingPsychologist
    psyData[key] = data[key] !== undefined ? data[key] : existingPsychologist[key];
  });

  const { data: updatedPsy, error: psyUpdateError } = await supabase
    .from('psychologists')
    .update(psyData)
    .eq('user_id', userId)
    .select()
    .single();

  if (psyUpdateError) throw new Error('Gagal update data psikolog');

  // Update topik hanya jika topik ada di payload
  let updatedTopics = [];
  if (Array.isArray(data.topics) && data.topics.length > 0) {
    const { data: psy, error: psyError } = await supabase
      .from('psychologists')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (psyError || !psy) throw new Error('Data psikolog tidak ditemukan');

    // Hapus topik lama
    await supabase
      .from('psychologists_topics')
      .delete()
      .eq('psychologist_id', psy.id);

    // Persiapkan data topik baru
    const topicsToInsert = data.topics.map((tid) => ({
      psychologist_id: psy.id,
      topic_id: tid,
    }));

    if (topicsToInsert.length > 0) {
      const { data: insertedTopics, error: insertError } = await supabase
        .from('psychologists_topics')
        .insert(topicsToInsert)
        .select(`
          topic_id,
          topics ( id, name )
        `);

      if (insertError) throw new Error('Gagal menyimpan topik baru');
      updatedTopics = insertedTopics;
    }
  }

  // Mengembalikan data yang telah diperbarui
  return {
    id: updatedUser.id,
    nickname: updatedUser.nickname,
    name: updatedUser.name,
    email: updatedUser.email,
    phone_number: updatedUser.phone_number,
    profile_image: updatedUser.profile_image,
    birthdate: updatedUser.birthdate,
    gender: updatedUser.gender,
    bio: updatedPsy.bio,
    experience: updatedPsy.experience,
    psychologists_topics: updatedTopics,
  };
};




const changeAvailability = async (userId, availability) => {
  const cleanAvailability = availability.toLowerCase().trim();
  if (!['available', 'unavailable'].includes(cleanAvailability)) {
    throw new Error('Ketersediaan harus "available" atau "unavailable"');
  }

  const { data: psyData, error: psyErr } = await supabase
    .from('psychologists')
    .select(`
      id,
      availability
    `)
    .eq('user_id', userId)
    .single();

  if (psyErr || !psyData) {
    console.error('❌ DB error:', psyErr?.message || 'Data kosong');
    throw new Error('Gagal mengambil data psikolog');
  }

  if (cleanAvailability === 'available') {
    const now = dayjs().tz('Asia/Jakarta');
    const currentDate = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');

    const { data: conflict, error: conflictError } = await supabase
      .from('counselings')
      .select('id')
      .eq('psychologist_id', psyData.id)
      .eq('schedule_date', currentDate)
      .lte('start_time', currentTime)
      .gt('end_time', currentTime)
      .in('payment_status', ['waiting', 'approved'])
      .maybeSingle();

    if (conflict) {
      const error = new Error('Tidak bisa mengubah ke available. Anda masih memiliki sesi counseling yang sedang berjalan.');
      error.statusCode = 423;
      throw error;
    }

    if (conflictError) {
      throw new Error('Gagal memeriksa konflik jadwal: ' + conflictError.message);
    }
  }

  const { error: updateErr } = await supabase
    .from('psychologists')
    .update({availability: cleanAvailability})
    .eq('id', psyData.id);

  if (updateErr) {
    throw new Error('Gagal memperbarui ketersediaan');
  }


  let availabilityMessage;
  if (availability == "available") {
    availabilityMessage = "tersedia";
  } else {
    availabilityMessage = "tidak tersedia";
  }

  return {
    psychologist_id: psyData.id,
    user_id: psyData.users.id,
    updated_availability: availability,
    message: `Ketersediaan psikolog berhasil diperbarui menjadi ${availabilityMessage}.`
  };
};

  
module.exports = { psychologistProfile, editPsychologistProfile, changeAvailability }