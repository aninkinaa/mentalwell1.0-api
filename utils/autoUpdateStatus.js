const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const { supabase } = require('../config/database');

const TIMEZONE = 'Asia/Jakarta';

async function handleFailed(counseling, now) {
  const { id, start_time, schedule_date, payment_status, access_type } = counseling;
  const start = dayjs.tz(`${schedule_date}T${start_time}`, TIMEZONE);

  if (!start.isValid() || now.isBefore(start)) return;

  const isFailedScheduled = access_type === 'scheduled' && payment_status !== 'approved';
  const isFailedOnDemand = access_type === 'on_demand' && !['waiting', 'approved'].includes(payment_status);

  if (isFailedScheduled || isFailedOnDemand) {
    try {
      await supabase.from('counselings').update({ status: 'failed' }).eq('id', id);
      console.log(`⛔ Counseling ID ${id} gagal karena pembayaran tidak valid.`);
    } catch (err) {
      console.error(`❌ Gagal update failed untuk ID ${id}:`, err.message);
    }
  }
}

async function handleStart(counseling, now) {
  const {
    id, status, payment_status,
    start_time, schedule_date,
    psychologist_id, patient_id,
  } = counseling;

  // Proses hanya jika status = waiting & payment_status = approved
  if (!(status === 'waiting' && payment_status === 'approved')) return;

  const start = dayjs.tz(`${schedule_date}T${start_time}`, TIMEZONE);
  if (!start.isValid() || now.isBefore(start)) return;

  try {
    // Update status counseling & ubah status psikolog jadi unavailable
    await supabase
      .from('counselings')
      .update({ status: 'on_going' })
      .eq('id', id);

    await supabase
      .from('psychologists')
      .update({ availability: 'unavailable' })
      .eq('id', psychologist_id);

    console.log(`▶️ Counseling ID ${id} dimulai otomatis.`);

    // Cek apakah sudah ada conversation aktif
    const { data: existingConv, error: existingError } = await supabase
      .from('conversations')
      .select('id')
      .eq('patient_id', patient_id)
      .eq('psychologist_id', psychologist_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingError) {
      console.error(`❌ Gagal cek conversation:`, existingError.message);
      return;
    }

    let conversationId = null;

    if (existingConv && existingConv.id) {
      // Gunakan conversation yang sudah ada
      conversationId = existingConv.id;
      console.log(`♻️ Menggunakan conversation ID yang sudah ada: ${conversationId}`);
    } else {
      // Buat conversation baru
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ patient_id, psychologist_id, status: 'active' })
        .select('id')
        .single();

      if (convError) {
        console.error(`❌ Gagal membuat conversation:`, convError.message);
        return;
      }

      conversationId = newConv.id;
      console.log(`💬 Conversation baru dibuat dengan ID ${conversationId}`);
    }

    // Update counseling dengan conversation_id
    if (conversationId) {
      const { error: updateError } = await supabase
        .from('counselings')
        .update({ conversation_id: conversationId })
        .eq('id', id);

      if (updateError) {
        console.error(`❌ Gagal update conversation_id ke counseling ID ${id}:`, updateError.message);
      } else {
        console.log(`✅ Counseling ID ${id} dikaitkan dengan conversation ID ${conversationId}`);
      }
    } else {
      console.warn(`⚠️ Tidak bisa update conversation_id karena ID tidak ditemukan`);
    }

  } catch (err) {
    console.error(`❌ Gagal memulai counseling ID ${id}:`, err.message);
  }
}


async function handleFinish(counseling, now) {
  const { id, status, start_time, end_time, schedule_date, psychologist_id } = counseling;

  if (status !== 'on_going' || !end_time) return;

  let endDate = dayjs.tz(`${schedule_date}T${end_time}`, TIMEZONE);

  if (start_time && end_time < start_time) {
    endDate = endDate.add(1, 'day'); 
  }

  if (!endDate.isValid() || now.isBefore(endDate)) return;

  try {
    const { data } = await supabase
      .from('counselings')
      .update({ status: 'finished' })
      .eq('id', id)
      .select('conversation_id')
      .single();

    await supabase.from('psychologists').update({ availability: 'available' }).eq('id', psychologist_id);

    // Pastikan conversation_id ada sebelum mencoba update
    if (data && data.conversation_id) {
      await supabase.from('conversations').update({ status: 'closed' }).eq('id', data.conversation_id);
    }
    
    console.log(`✅ Counseling ID ${id} selesai, conversation ditutup.`);
  } catch (err) {
    console.error(`❌ Gagal menyelesaikan counseling ID ${id}:`, err.message);
  }
}

async function updateCounselingStatuses() {
  const now = dayjs.tz(new Date(), TIMEZONE);

  const { data: counselings, error } = await supabase
    .from('counselings')
    .select('*')
    .in('status', ['waiting', 'on_going']);

  if (error) {
    console.error('❌ Gagal mengambil data counseling:', error.message);
    return;
  }

  for (const counseling of counselings) {
    const { id, schedule_date, start_time } = counseling;

    if (!schedule_date || !start_time) {
      console.warn(`⚠️ Counseling ID ${id} tidak punya jadwal lengkap, dilewati.`);
      continue;
    }

    await handleFailed(counseling, now);
    await handleStart(counseling, now);
    await handleFinish(counseling, now);
  }
}

function startAutoUpdateCounselings() {
  updateCounselingStatuses();
  setInterval(updateCounselingStatuses, 60 * 1000);
}

module.exports = { startAutoUpdateCounselings };