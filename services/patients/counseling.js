const { supabase } = require('../../config/database');
const { uploadPhotoToSupabase } = require('../../config/uploadFile');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const autoFill = async (userId) => {
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select(`
      id,
      users (
        name,
        nickname,
        birthdate,
        email,
        phone_number,
        gender
      )
    `)
    .eq('user_id', userId)
    .single();

  if (patientError) {
    throw new Error('Gagal mengambil data user' + patientError.message);
  }

  if (!patient) {
    throw new NotFoundError('Data tidak ditemukan');
  }

  return patient;
};

const createCounseling = async (userId, psychologistId, counselingData, paymentFile) => {
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select(`
      id,
      users (
        name,
        nickname,
        birthdate,
        phone_number,
        gender
      )
    `)
    .eq('user_id', userId)
    .single();

  if (patientError) {
    if (patientError.message.includes('multiple (or no) rows returned')) {
      throw new NotFoundError('Data tidak ditemukan');
    }
    throw new Error('Gagal mengambil data pasien: ' + (patientError.message || 'Unknown error'));
  }

  if (!patient) {
    throw new NotFoundError('Tidak ditemukan data user, hanya user yang terdaftar yang dapat membuat jadwal konseling');
  }

  if (!paymentFile) {
    throw new ValidationError('Harap lampirkan bukti pembayaran');
  }

  const uploadResult = await uploadPhotoToSupabase({
    file: paymentFile,
    folder: 'payment_proofs',
    prefix: userId,
  });

  if (!uploadResult.success) {
    throw new Error('Gagal upload bukti pembayaran');
  }

  const paymentProofUrl = uploadResult.url;

  const { data: psychologist, error: psyError } = await supabase
    .from('psychologists')
    .select(`
      id,
      users (name)
    `)
    .eq('id', psychologistId)
    .single();

  if (psyError) {
    if (psyError.message.includes('multiple (or no) rows returned')) {
      throw new NotFoundError('Data tidak ditemukan');
    }
    throw new Error('Terjadi kesalahan: ' + (psyError.message || 'Unknown error'));
  }

  if (!psychologist) {
    throw new NotFoundError('Tidak ditemukan psikolog');
  }

  const [startTime, endTime] = counselingData.schedule_time.split('-');

  const newCounseling = {
    patient_id: patient.id,
    psychologist_id: psychologist.id,
    schedule_date: counselingData.schedule_date,
    start_time: startTime,
    end_time: endTime,
    occupation: counselingData.occupation,
    problem_description: counselingData.problem_description,
    hope_after: counselingData.hope_after,
    status: 'waiting',
    payment_proof: paymentProofUrl,
    payment_status: 'waiting',
  };

  const { data: inserted, error: insertError } = await supabase
    .from('counselings')
    .insert(newCounseling)
    .select('id, schedule_date, start_time, end_time, occupation, problem_description, hope_after, payment_status, status')
    .single();

  if (insertError) {
    throw new Error('Gagal membuat counseling: ' + (insertError.message || 'Unknown error'));
  }

  const response = {
    name: patient.users.name,
    nickname: patient.users.nickname,
    birthdate: patient.users.birthdate,
    phone_number: patient.users.phone_number,
    gender: patient.users.gender,
    psychologist_name: psychologist.users.name,
    counseling_id: inserted.id,
    schedule_date: inserted.schedule_date,
    schedule_time: inserted.start_time.slice(0, 5) + '-' + inserted.end_time.slice(0, 5),
    occupation: inserted.occupation,
    problem_description: inserted.problem_description,
    hope_after: inserted.hope_after,
    payment_status: inserted.payment_status,
    status: inserted.status,
  };

  return response;
};

const chatNowCounseling = async (userId, psychologistId, counselingData, paymentFile) => {
  const now = dayjs().tz('Asia/Jakarta');
  const scheduleDate = now.format('YYYY-MM-DD');
  const currentTime = now.format('HH:mm');
  const nextHour = now.add(1, 'hour').format('HH:mm');

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select(`
      id,
      users (
        name,
        nickname,
        birthdate,
        phone_number,
        gender
      )
    `)
    .eq('user_id', userId)
    .single();

  if (patientError || !patient) {
    throw new NotFoundError('Data pasien tidak ditemukan');
  }

  if (!paymentFile) {
    throw new ValidationError('Harap lampirkan bukti pembayaran');
  }

  const uploadResult = await uploadPhotoToSupabase({
    file: paymentFile,
    folder: 'payment_proofs',
    prefix: userId,
  });

  if (!uploadResult.success) {
    throw new Error('Gagal upload bukti pembayaran');
  }

  const paymentProofUrl = uploadResult.url;

  const { data: psychologist, error: psyError } = await supabase
    .from('psychologists')
    .select(`
      id,
      availability,
      price,
      users (name)
    `)
    .eq('id', psychologistId)
    .single();

  if (psyError || !psychologist) {
    throw new NotFoundError('Psikolog tidak ditemukan');
  }

  let failedReason = null;
  const psychologistAvailability = psychologist.availability.toLowerCase();

  if (psychologistAvailability !== 'available') {
    failedReason = 'Psikolog tidak tersedia saat ini.';
  } else {
    const { data: conflict } = await supabase
      .from('counselings')
      .select('id')
      .eq('psychologist_id', psychologistId)
      .eq('schedule_date', scheduleDate)
      .lte('start_time', nextHour)
      .gt('end_time', currentTime)
      .in('payment_status', ['waiting', 'approved'])
      .maybeSingle();

    if (conflict) {
      failedReason = 'Psikolog sedang dalam sesi lain.';
    }
  }

  if (!failedReason) {
    await supabase
      .from('psychologists')
      .update({ availability: 'unavailable' })
      .eq('id', psychologist.id);
  }

  const counselingPayload = {
    patient_id: patient.id,
    psychologist_id: psychologist.id,
    occupation: counselingData.occupation,
    problem_description: counselingData.problem_description,
    hope_after: counselingData.hope_after,
    status: failedReason ? 'failed' : 'waiting',
    price: psychologist.price,
    payment_proof: paymentProofUrl,
    payment_status: 'waiting',
    access_type: 'on_demand',
    payment_note: failedReason ? `${failedReason} Admin akan meninjau pembayaran Anda.` : null,
    schedule_date: scheduleDate,
    start_time: currentTime,
    end_time: nextHour,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('counselings')
    .insert(counselingPayload)
    .select('id, status, price, payment_status, payment_note, created_at')
    .single();

  if (insertError) {
    throw new Error('Gagal menyimpan data sesi chat: ' + insertError.message);
  }

  return {
    name: patient.users.name,
    nickname: patient.users.nickname,
    birthdate: patient.users.birthdate,
    phone_number: patient.users.phone_number,
    gender: patient.users.gender,
    psychologist_name: psychologist.users.name,
    price: inserted.price,
    counseling_id: inserted.id,
    occupation: counselingData.occupation,
    problem_description: counselingData.problem_description,
    hope_after: counselingData.hope_after,
    payment_status: inserted.payment_status,
    status: inserted.status,
    type: 'on_demand',
    schedule_date: scheduleDate,
    schedule_time: `${currentTime}-${nextHour}`,
    payment_note: inserted.payment_note,
    created_at: inserted.created_at,
    message: failedReason
      ? `${failedReason} Admin akan meninjau dan memproses pembayaran Anda.`
      : 'Sesi chat berhasil diminta. Menunggu persetujuan admin.',
  };
};

const bookScheduleCounseling = async (userId, psychologistId, counselingData, paymentFile) => {
  const { schedule_date, schedule_time, occupation, problem_description, hope_after } = counselingData;
  const [startTime, endTime] = schedule_time.split('-').map((t) => t.trim());

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select(`id, users (name, nickname, birthdate, phone_number, gender)`)
    .eq('user_id', userId)
    .single();

  if (patientError || !patient) throw new NotFoundError('Data pasien tidak ditemukan');

  if (!paymentFile) throw new ValidationError('Harap lampirkan bukti pembayaran');

  const uploadResult = await uploadPhotoToSupabase({
    file: paymentFile,
    folder: 'payment_proofs',
    prefix: userId,
  });

  if (!uploadResult.success) throw new Error('Gagal upload bukti pembayaran');

  const paymentProofUrl = uploadResult.url;

  const { data: psychologist, error: psyError } = await supabase
    .from('psychologists')
    .select(`id, price, users (name)`)
    .eq('id', psychologistId)
    .single();

  if (psyError || !psychologist) throw new NotFoundError('Psikolog tidak ditemukan');

  const { data: conflict } = await supabase
    .from('booked_schedules')
    .select('id')
    .eq('psychologist_id', psychologistId)
    .eq('date', schedule_date)
    .lte('start_time', endTime)
    .gte('end_time', startTime);

  const failedReason = conflict?.length > 0 ? 'Waktu tersebut sudah dibooking. Silakan pilih waktu lain.' : null;

  const { data: inserted, error: insertError } = await supabase
    .from('counselings')
    .insert({
      patient_id: patient.id,
      psychologist_id: psychologist.id,
      price: psychologist.price,
      schedule_date,
      start_time: startTime,
      end_time: endTime,
      occupation,
      problem_description,
      hope_after,
      status: failedReason ? 'failed' : 'waiting',
      payment_proof: paymentProofUrl,
      payment_status: 'waiting',
      access_type: 'scheduled',
      payment_note: failedReason ? `${failedReason} Admin akan meninjau pembayaran Anda.` : null,
    })
    .select('id, price, schedule_date, start_time, end_time, status, payment_status, payment_note, created_at')
    .single();

  if (insertError) throw new Error('Gagal membuat sesi konseling terjadwal: ' + insertError.message);

  if (!failedReason) {
    const { error: bookedError } = await supabase
      .from('booked_schedules')
      .insert({
        psychologist_id: psychologist.id,
        date: inserted.schedule_date,
        start_time: inserted.start_time,
        end_time: inserted.end_time,
        counseling_id: inserted.id,
      });
    if (bookedError) throw new Error('Gagal mencatat jadwal yang sudah dibooking');
  }

  return {
    name: patient.users.name,
    nickname: patient.users.nickname,
    birthdate: patient.users.birthdate,
    phone_number: patient.users.phone_number,
    gender: patient.users.gender,
    psychologist_name: psychologist.users.name,
    price: inserted.price,
    counseling_id: inserted.id,
    schedule_date: inserted.schedule_date,
    schedule_time: `${inserted.start_time.slice(0, 5)}-${inserted.end_time.slice(0, 5)}`,
    occupation,
    problem_description,
    hope_after,
    payment_status: inserted.payment_status,
    status: inserted.status,
    type: 'scheduled',
    payment_note: inserted.payment_note,
    created_at: inserted.created_at,
    message: failedReason
      ? `${failedReason} Admin akan meninjau dan memproses pembayaran Anda.`
      : 'Sesi berhasil diminta. Menunggu persetujuan admin.',
  };
};

const viewCounselings = async (userId) => {
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (patientError) {
    if (patientError.message.includes('multiple (or no) rows returned')) {
      throw new NotFoundError('Tidak ditemukan data pasien');
    }
    throw new Error('Terjadi kesalahan: ' + (patientError.message || 'unknown error'));
  }

  const { data: counselings, error: counselingError } = await supabase
    .from('counselings')
    .select(`
      id,
      schedule_date,
      start_time,
      end_time,
      status,
      payment_status,
      review,
      created_at,
      psychologists (
        users (
          name,
          profile_image
        )
      )
    `)
    .eq('patient_id', patient.id);

  if (counselingError) {
    throw new Error('Terjadi kesalahan: ' + (counselingError.message || 'Unknown error'));
  }

  const cleanedCounselings = counselings
    .map((counseling) => ({
      id: counseling.id,
      psychologist_name: counseling.psychologists.users.name,
      psychologist_profpic: counseling.psychologists.users.profile_image,
      schedule_date: counseling.schedule_date,
      schedule_time: `${counseling.start_time.slice(0, 5)}-${counseling.end_time.slice(0, 5)}`,
      status: counseling.status,
      payment_status: counseling.payment_status,
      created_at: counseling.created_at,
      has_review: !!counseling.review,
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return cleanedCounselings;
};

const selectCounseling = async (counselingId) => {
  const { data: counseling, error: counsError } = await supabase
    .from('counselings')
    .select(`
      id,
      schedule_date,
      start_time,
      end_time,
      status,
      price,
      payment_status,
      payment_note,
      created_at,
      review,
      conversation_id,
      psychologists (
        price,
        users (
          name,
          profile_image
        )
      )
    `)
    .eq('id', counselingId)
    .single();

  if (counsError) {
    if (counsError.message.includes('multiple (or no) rows returned')) {
      throw new NotFoundError('Tidak ditemukan data konseling');
    }
    throw new Error('Terjadi kesalahan: ' + (counsError.message || 'unknown error'));
  }

  const detailedCounseling = {
    id: counseling.id,
    conversation_id: counseling.conversation_id,
    psychologist_name: counseling.psychologists.users.name,
    psychologist_profpic: counseling.psychologists.users.profile_image,
    price: counseling.price,
    schedule_date: counseling.schedule_date,
    schedule_time: counseling.start_time.slice(0, 5) + '-' + counseling.end_time.slice(0, 5),
    status: counseling.status,
    payment_status: counseling.payment_status,
    payment_note: counseling.payment_note || null,
    created_at: counseling.created_at,
    review: counseling.review,
  };

  return detailedCounseling;
};

module.exports = {
  autoFill,
  createCounseling,
  chatNowCounseling,
  bookScheduleCounseling,
  viewCounselings,
  selectCounseling,
};
