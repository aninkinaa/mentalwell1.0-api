const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const { supabase } = require('../config/database')

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

  if (!(status === 'waiting' && payment_status === 'approved')) return;

  const start = dayjs.tz(`${schedule_date}T${start_time}`, TIMEZONE);
  if (!start.isValid() || now.isBefore(start)) return;

  try {
    await supabase.from('counselings').update({ status: 'on_going' }).eq('id', id);
    await supabase.from('psychologists').update({ availability: 'unavailable' }).eq('id', psychologist_id);
    console.log(`▶️ Counseling ID ${id} dimulai otomatis.`);

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('patient_id', patient_id)
      .eq('psychologist_id', psychologist_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!existingConv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ patient_id, psychologist_id, status: 'active' })
        .select('id')
        .single();

      await supabase.from('counselings').update({ conversation_id: newConv.id }).eq('id', id);
      console.log(`💬 Conversation dibuat untuk counseling ID ${id}`);
    }
  } catch (err) {
    console.error(`❌ Gagal memulai counseling ID ${id}:`, err.message);
  }
}

async function handleFinish(counseling, now) {
  const { id, status, end_time, schedule_date, psychologist_id } = counseling;

  if (status !== 'on_going' || !end_time) return;

  const end = dayjs.tz(`${schedule_date}T${end_time}`, TIMEZONE);
  if (!end.isValid() || now.isBefore(end)) return;

  try {
    const { data } = await supabase
      .from('counselings')
      .update({ status: 'closed' })
      .eq('id', id)
      .select('conversation_id')
      .single();

    await supabase.from('psychologists').update({ availability: 'available' }).eq('id', psychologist_id);
    await supabase.from('conversations').update({ status: 'closed' }).eq('id', data.conversation_id);
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
