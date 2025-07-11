const { supabase } = require('../config/database');
const dayjs = require('dayjs');
const { calculateAge } = require('../utils/calculateAge');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);


const allPsychologists = async () => {
  const { data, error } = await supabase
  .from ('psychologists_view')
  .select('*');
  
  if (error) throw new Error('Gagal ambil data psikolog: ' + error.message);

  const result = data.map(psych => ({
    id: psych.id,
    name: psych.name || null,
    age: psych.age || null,
    profile_image: psych.profile_image || null,
    bio: psych.bio || null,
    experience: psych.experience || null,
    availability: psych.availability,
    can_be_scheduled: psych.can_be_scheduled || false,
    can_chat_now: psych.can_chat_now || false,
    topics: psych.topics || []
  }));

  result.sort((a, b) => {
    if (a.can_chat_now === b.can_chat_now) return 0;
    return a.can_chat_now ? -1 : 1;
  });

  return result;
};



const listDetailedPsychologits = async () => {
  const { data, error } = await supabase
  .from('psychologists')
  .select(`
    id,
    bio,
    experience,
    availability,
    price,
    users (
      name,
      profile_image,
      birthdate
    ),
    counselings (
      review
    )
  `);

if (error) {
  throw new Error('Gagal mengambil data psikolog: ' + error.message);
}

const formatted = data.map(psych => {
  const reviewCount = psych.counselings?.filter(c => c.review !== null).length || 0;

  return {
    id: psych.id,
    name: psych.users?.name || null,
    bio: psych.bio,
    experience: psych.experience,
    price: psych.price,
    age: psych.users?.birthdate
      ? calculateAge(psych.users.birthdate)
      : null,
    availability: psych.availability,
    profile_image: psych.users?.profile_image || null,
    counselings: {
      review: {
        count: reviewCount
      }
    }
  };
});

return formatted;
}

const searchPsychologists = async ({ name, topics }) => {
  const { data, error } = await supabase
    .from('searchable_psychologists')
    .select('*');

  if (error) throw new Error('Gagal ambil data psikolog: ' + error.message);

  const formatResult = (list) =>
    list.map(p => ({
      id: p.id,
      name: p.name || '-',
      bio: p.bio,
      experience: p.experience,
      availability: p.availability,
      price: p.price || null,
      age: p.birthdate ? calculateAge(p.birthdate) : null,
      topics: p.topics || [],
      profile_image: p.profile_image || null,
    }));

    let filteredAND = data;
    if (name) {
      const keywords = name.toLowerCase().trim().split(/\s+/);
      filteredAND = filteredAND.filter(p =>
        keywords.some(k => (p.name || '').toLowerCase().includes(k))
      );
    }
    
    if (topics?.length > 0) {
      filteredAND = filteredAND.filter(p =>
        (p.topics || []).some(t => topics.includes(t.id))
      );
    }
  
    if (filteredAND.length > 0) {
      return {
        message: 'Ditemukan hasil yang sesuai semua filter.',
        result: formatResult(filteredAND),
      };
    }
  
    let filteredOR = data.filter(p => {
      const nameMatch = name
        ? (p.name || '').toLowerCase().includes(name.toLowerCase())
        : false;
      const topicMatch = topics?.length > 0
        ? (p.topics || []).some(t => topics.includes(t.id))
        : false;
      return nameMatch || topicMatch;
    });
  
    if (filteredOR.length > 0) {
      return {
        message: 'Tidak ditemukan hasil sesuai semua filter, tapi ini hasil yang mirip.',
        result: formatResult(filteredOR),
      };
    }
  
    return {
      message: 'Tidak ditemukan psikolog yang sesuai.',
      result: [],
    };
  };


const selectPsychologist = async (id) => {
  
  const { data, error } = await supabase
    .from('psychologists')
    .select(`
      id,
      bio,
      experience,
      availability,
      price,
      users (
        name,
        profile_image,
        birthdate,
        gender
      ),
      counselings (
        review,
        patient_id
      ),
      psychologists_topics (
        topics (
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error('Gagal ambil data psikolog: ' + error.message);

  const { counselings = [] } = data;

  // patient id yang ngereview
  const patientIds = [
    ...new Set(counselings.map(c => c.patient_id).filter(Boolean))
  ];

  const { data: patientsData, error: patientsError } = await supabase
    .from('patients')
    .select('id, users (id, name, profile_image)')
    .in('id', patientIds);

  if (patientsError) throw new Error('Gagal ambil data pasien: ' + patientsError.message);

  // Buat map untuk lookup cepat
  const patientUserMap = {};
  for (const p of patientsData) {
    if (p && p.users) {
      patientUserMap[p.id] = p.users;
    }
  }

  // Format review
  const reviews = counselings
    .filter(c => c.review?.trim())
    .map(c => {
      const user = patientUserMap[c.patient_id] || { id: null, name: 'Anonim' };
      return {
        id: user.id,
        patient: user.name,
        profpic : user.profile_image,
        review: c.review
      };
    });

  return {
    id: data.id,
    name: data.users?.name || null,
    gender: data.users.gender || null,
    bio: data.bio || null,
    experience: data.experience || null,
    availability: data.availability,
    price: data.price,
    age: data.users?.birthdate 
      ? calculateAge(data.users.birthdate)
      : null,
    profile_image: data.users?.profile_image || null,
    topics: (data.psychologists_topics || []).map(t => t.topics),
    review_count: reviews.length,
    reviews
  };
};


module.exports = { allPsychologists, listDetailedPsychologits, searchPsychologists, selectPsychologist };
