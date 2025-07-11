const { supabase } = require('../../config/database')
const { uploadPhotoToSupabase } = require('../../config/uploadFile');
const { ValidationError } = require('../../utils/errors');
const bcrypt = require('bcryptjs');

const addPsychologist = async (userData, psychologistData, topics = [], schedules = [], profileImageFile) => {
  const {
    name, nickname, email, phone_number, birthdate, gender, password
  } = userData;

  const {
    bio, experience, price
  } = psychologistData;

  let profileImageUrl = null;

  if (profileImageFile) {
    const uploadResult = await uploadPhotoToSupabase({
      file: profileImageFile,
      folder: 'profile_images',
      prefix: nickname || name
    });
    if (!uploadResult.success) throw new ValidationError('Gagal upload foto');
    profileImageUrl = uploadResult.url;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name, nickname, email, phone_number, birthdate, gender,
        password: hashedPassword,
        profile_image: profileImageUrl,
        role: 'psychologist',
      })
      .select('*')
      .single();

  if (userError) {
    if (userError.code === '23505') {
      const duplicateField = userError.message.includes('email') ? 'Email' : 
                             userError.message.includes('phone_number') ? 'Nomor telepon' : 'Data';
      throw new ValidationError(`${duplicateField} sudah digunakan`);
    }
    throw new ValidationError('Gagal membuat akun user: ' + userError.message);
  }

  const { data: psychologist, error: psyError } = await supabase
      .from('psychologists')
      .insert({
        user_id: user.id,
        bio,
        experience,
        price,
        availability: 'unavailable', 
        created_at: user.created_at 
      })
      .select('*')
      .single();

  if (psyError) throw new ValidationError('Gagal menyimpan data psikolog: ' + psyError.message);

  if (Array.isArray(topics) && topics.length > 0) {
    const topicData = topics.map(topicId => ({
      psychologist_id: psychologist.id,
      topic_id: topicId
    }));
    await supabase.from('psychologists_topics').insert(topicData);
  }

  let insertedTopics = [];
  if (Array.isArray(topics) && topics.length > 0) {
    const { data: topicResults } = await supabase
      .from('psychologists_topics')
      .select('topic_id, topics ( id, name )')
      .eq('psychologist_id', psychologist.id);
    insertedTopics = topicResults?.map(t => t.topics) || [];
  }

  let insertedSchedules = [];
  let weeklyData = [];
  let customData = [];
  
  if (Array.isArray(schedules) && schedules.length > 0) {
    const weekly = schedules.filter(s => s.day && !s.date);
    const custom = schedules.filter(s => s.date && !s.day);
  
    if (weekly.length > 0) {
      const formattedWeekly = weekly.map(s => ({
        psychologist_id: psychologist.id,
        day: s.day,
        start_time: s.start_time,
        end_time: s.end_time
      }));
  
      const { data, error: insertWeeklyError } = await supabase
        .from('psychologist_weekly_availabilities')
        .insert(formattedWeekly)
        .select('*');
  
      if (insertWeeklyError) {
        console.error('❌ Gagal insert jadwal mingguan:', insertWeeklyError.message);
      } else {
        weeklyData = data;
      }
    }
  
    if (custom.length > 0) {
      const formattedCustom = custom.map(s => ({
        psychologist_id: psychologist.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time
      }));
  
      const { data, error: insertCustomError } = await supabase
        .from('psychologist_schedules')
        .insert(formattedCustom)
        .select('*');
  
      if (insertCustomError) {
        console.error('❌ Gagal insert jadwal khusus:', insertCustomError.message);
      } else {
        customData = data;
      }
    }
  
    insertedSchedules = [
      ...(weeklyData || []),
      ...(customData || [])
    ];
  }

  return {
    message: 'Psikolog berhasil ditambahkan',
    id: psychologist.id,
    name: user.name,
    nickname: user.nickname,
    birthdate: user.birthdate,
    phone_number: user.phone_number,
    email: user.email,
    bio: psychologist.bio,
    experience: psychologist.experience,
    price: psychologist.price,
    profile_image: user.profile_image,
    topics: insertedTopics,
    schedules: insertedSchedules
  }
};

const updateUserInfo = async (userId, data, file) => {
  const updateUser = {};
  const fields = ['name', 'nickname', 'email', 'phone_number', 'birthdate', 'gender'];
  fields.forEach(key => {
    if (data[key] !== undefined) updateUser[key] = data[key];
  });

  if (file) {
    // Ambil data user saat ini untuk cek foto lama
    const { data: currentUser } = await supabase
      .from('users')
      .select('profile_image')
      .eq('id', userId)
      .single();

    // Hapus foto lama jika ada
    if (currentUser?.profile_image) {
      try {
        const oldFileName = currentUser.profile_image.split('/').pop();
        if (oldFileName) {
          const { error: deleteError } = await supabase.storage
            .from('mentalwell-bucket')
            .remove([`profile_images/${oldFileName}`]);
          if (deleteError) {
            console.warn(`Gagal menghapus foto lama: ${deleteError.message}`);
          }
        }
      } catch (e) {
        console.warn('Gagal memproses penghapusan foto lama:', e.message);
      }
    }

    // Upload foto baru
    const uploadResult = await uploadPhotoToSupabase({
      file,
      folder: 'profile_images',
      prefix: data.nickname || data.name || userId
    });
    if (!uploadResult.success) {
      throw new Error('Gagal mengunggah foto profil');
    }
    updateUser.profile_image = uploadResult.url;
  }

  if (data.password) {
    updateUser.password = await bcrypt.hash(data.password, 10);
  }

  if (Object.keys(updateUser).length > 0) {
    const { error } = await supabase
      .from('users')
      .update(updateUser)
      .eq('id', userId);
    if (error) throw new Error('Gagal update data user');
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, name, nickname, email, phone_number, birthdate, gender, profile_image')
    .eq('id', userId)
    .single();

  return user;
};

const updatePsychologistInfo = async (userId, data) => {
  const updatePsychologist = {};
  const fields = ['bio', 'experience', 'price', 'availability'];
  fields.forEach(key => {
    if (data[key] !== undefined) updatePsychologist[key] = data[key];
  });

  if (Object.keys(updatePsychologist).length > 0) {
    const { error } = await supabase
      .from('psychologists')
      .update(updatePsychologist)
      .eq('user_id', userId);
    if (error) throw new Error('Gagal update data psikolog');
  }

  const { data: psy } = await supabase
    .from('psychologists')
    .select('bio, experience, price, availability')
    .eq('user_id', userId)
    .single();

  return psy;
};

const updatePsychologistTopics = async (psychologistId, topics) => {
  await supabase.from('psychologists_topics').delete().eq('psychologist_id', psychologistId);
  if (topics.length > 0) {
    const toInsert = topics.map(tid => ({ psychologist_id: psychologistId, topic_id: tid }));
    await supabase.from('psychologists_topics').insert(toInsert);
  }

  const { data } = await supabase
    .from('psychologists_topics')
    .select('topic_id, topics ( id, name )')
    .eq('psychologist_id', psychologistId);
    
  return data?.map(t => t.topics) || [];
};

const updatePsychologistSchedules = async (psychologistId, schedules) => {
  await supabase.from('psychologist_weekly_availabilities').delete().eq('psychologist_id', psychologistId);
  await supabase.from('psychologist_schedules').delete().eq('psychologist_id', psychologistId);

  let weeklyData = [];
  let customData = [];

  if (Array.isArray(schedules) && schedules.length > 0) {
    const weekly = schedules.filter(s => s.day && !s.date);
    const custom = schedules.filter(s => s.date && !s.day);

    if (weekly.length > 0) {
      const formattedWeekly = weekly.map(s => {
        const start_time = s.start_time || s.time?.split('-')[0]?.trim();
        const end_time = s.end_time || s.time?.split('-')[1]?.trim();
        return {
          psychologist_id: psychologistId,
          day: s.day,
          start_time,
          end_time
        };
      });

      const { data, error } = await supabase
        .from('psychologist_weekly_availabilities')
        .insert(formattedWeekly)
        .select('*');

      if (error) {
        console.error('❌ Gagal insert jadwal mingguan:', error.message);
      } else {
        weeklyData = data;
      }
    }

    if (custom.length > 0) {
      const formattedCustom = custom.map(s => {
        const start_time = s.start_time || s.time?.split('-')[0]?.trim();
        const end_time = s.end_time || s.time?.split('-')[1]?.trim();
        return {
          psychologist_id: psychologistId,
          date: s.date,
          start_time,
          end_time
        };
      });

      const { data, error } = await supabase
        .from('psychologist_schedules')
        .insert(formattedCustom)
        .select('*');

      if (error) {
        console.error('❌ Gagal insert jadwal khusus:', error.message);
      } else {
        customData = data;
      }
    }
  }

  return {
    weekly: weeklyData,
    custom: customData
  };
};

const editPsychologist = async (psychologistId, userData, profileImageFile) => {
  if (typeof userData.topics === 'string') {
    try {
    userData.topics = JSON.parse(userData.topics);
    } catch (e) {
      console.warn('Failed to parse topics:', userData.topics);
      userData.topics = [];
    }
  }

  if (typeof userData.schedules === 'string') {
   try {
      userData.schedules = JSON.parse(userData.schedules);
    } catch (e) {
      console.warn('Failed to parse schedules:', userData.schedules);
      userData.schedules = [];
   }
  }

  const { data: psychologist, error } = await supabase
    .from('psychologists')
    .select('user_id')
    .eq('id', psychologistId)
    .single();

  if (error || !psychologist) throw new Error('Psikolog tidak ditemukan');
  const userId = psychologist.user_id;

  const updatedUser = await updateUserInfo(userId, userData, profileImageFile);
  const updatedPsy = await updatePsychologistInfo(userId, userData);

  let updatedTopics = [];
  if (Array.isArray(userData.topics)) {
    updatedTopics = await updatePsychologistTopics(psychologistId, userData.topics);
  }

  let updatedSchedules = {};
  if (Array.isArray(userData.schedules)) {
    updatedSchedules = await updatePsychologistSchedules(psychologistId, userData.schedules);
  }

  return {
    message: 'Profil psikolog berhasil diperbarui',
    data: {
      ...updatedUser,
      ...updatedPsy,
      topics: updatedTopics,
      schedules: updatedSchedules
    }
  };
};
  
const psychologistDetails = async (psychologistId) => {
  const { data: user, error: userError } = await supabase
  .from('psychologists')
  .select(`
    id, bio, experience, price, availability,
    users (
      id, name, nickname, email, phone_number, birthdate, gender,
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
  .eq('id', psychologistId)
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
    gender: user.users.gender,
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

module.exports = { addPsychologist, editPsychologist, psychologistDetails };
