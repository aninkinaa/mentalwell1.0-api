const { supabase } = require('../../config/database')
const { NotFoundError, ConflictError } = require('../../utils/errors')
// email
const { sendNewCounselingEmail, sendChatNowCounselingEmail } = require('../../utils/emails/psy-newCounseling-notif');
const {sendPatientConfirmedScheduledEmail, sendPatientConfirmedRealtimeEmail, sendPatientRejectedEmail, sendPatientRefundedEmail } = require('../../utils/emails/pat-newCounseling-notif')
// whatsapp
const { sendWhatsAppCounselingNotification, sendWhatsappRealtimeConseling } = require('../../utils/whatsapps/psy-newCounseling-notif');
const { sendWhatsAppPatientConfirmedRealtime, sendWhatsAppPatientConfirmedScheduled, sendWhatsAppPatientRefunded, sendWhatsAppPatientRejected} = require('../../utils/whatsapps/pat-newCounseling-notif')

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);


const selectCounseling = async (counselingId) => {
    const { data: counseling, error: counsError } = await supabase
    .from('counselings')
    .select(`*,
        psychologists( id,
        users(
        name, profile_image, profile_image)),
        patients(id,
        users(
        name, profile_image, email, phone_number))`)
    .eq('id', counselingId)
    .single();

    if(counsError){
        if(counsError.message.includes('multiple (or no) rows returned')){
            throw new NotFoundError('Tidak ditemukan konseling terkait')
        }
        throw new Error('Terjadi kesalahan: ' + counsError.message)
    }

    if(!counseling){
        throw new NotFoundError('Tidak ditemukan konseling terkait')
    }

    const detailedCounseling = {
        id: counseling.id,
        patient_id: counseling.patients.id,
        patient_name: counseling.patients.users.name,
        patient_profpic: counseling.patients.users.profile_image,
        patient_email: counseling.patients.users.email,
        patient_phone_number: counseling.patients.phone_number,
        psychologist_id: counseling.psychologist_id,
        psychologist_name: counseling.psychologists.users.name,
        psychologist_profpic: counseling.psychologists.users.profile_image,
        schedule_date: counseling.schedule_date,
        schedule_time: counseling.start_time.slice(0, 5) + '-' + counseling.end_time.slice(0, 5),
        status: counseling.status,
        price: counseling.price,
        payment_status: counseling.payment_status,
        payment_proof: counseling.payment_proof,
        payment_note: counseling.payment_note,
        access_type: counseling.access_type,
        created_at: counseling.created_at
    }

    return detailedCounseling
}


const changePaymentStatus = async (counselingId, updatedStatus, note = null) => {
  const { data: counselingMeta, error: metaError } = await supabase
    .from('counselings')
    .select('id, payment_status, access_type, psychologist_id, status')
    .eq('id', counselingId)
    .single();

  if (metaError || !counselingMeta) {
    throw new NotFoundError('Konseling tidak ditemukan');
  }

  const counselingStatus = counselingMeta.status;
  const currentPaymentStatus = counselingMeta.payment_status?.toLowerCase();
  const isChatNow = counselingMeta.access_type === 'on_demand';
  const lowerStatus = updatedStatus.toLowerCase();

  if (['approved', 'rejected', 'refunded'].includes(currentPaymentStatus)) {
    throw new ConflictError('Status pembayaran sudah final dan tidak bisa diubah');
  }

  if (counselingStatus === 'failed' && lowerStatus === 'approved') {
    throw new ConflictError('Tidak bisa menyetujui pembayaran untuk sesi yang gagal. Hanya bisa tolak atau refund.');
  }

  const updatePayload = {
    payment_status: lowerStatus,
    payment_note: note || null,
  };

  if (isChatNow && lowerStatus === 'approved') {
    const now = dayjs().tz('Asia/Jakarta');
    updatePayload.schedule_date = now.format('YYYY-MM-DD');
    updatePayload.start_time = now.format('HH:mm');
    updatePayload.end_time = now.add(1, 'hour').format('HH:mm');
  }

  if (counselingStatus === 'failed') {
    if (lowerStatus === 'refunded') {
      updatePayload.payment_note = 'Pembayaran telah dikembalikan ke rekening Anda.';
    } else if (lowerStatus === 'rejected' && !note) {
      throw new ValidationError('Harap isi alasan penolakan pembayaran.');
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('counselings')
    .update(updatePayload)
    .eq('id', counselingId)
    .select(`
      id,
      payment_status,
      payment_note,
      payment_proof,
      start_time,
      end_time,
      schedule_date,
      status,
      access_type,
      patients (
        id,
        users (
          name, email, phone_number
        )
      ),
      psychologists (
        id,
        users (
          name, email, phone_number
        )
      ),
      created_at
    `)
    .single();

  if (updateError || !updated) {
    throw new Error('Gagal update status pembayaran: ' + (updateError?.message || 'unknown'));
  }

  if (lowerStatus === 'approved') {
    const toEmail = updated.psychologists.users.email;
    const toPhone = updated.psychologists.users.phone_number;
    const psName = updated.psychologists.users.name;
    const patientName = updated.patients.users.name;
    const date = updated.schedule_date;
    const time = `${updated.start_time.slice(0, 5)} - ${updated.end_time.slice(0, 5)}`;
    const patientEmail = updated.patients.users.email;
    const patientPhone = updated.patients.users.phone_number;
    const psychologistName = updated.psychologists.users.name;
  
    if (updated.access_type === 'on_demand') {
        await sendChatNowCounselingEmail(toEmail, psName, patientName);
        await sendWhatsappRealtimeConseling(toPhone, psName, patientName);

        await sendPatientConfirmedRealtimeEmail(patientEmail, patientName, psychologistName);
        if (patientPhone) {
            await sendWhatsAppPatientConfirmedRealtime(patientPhone, patientName, psychologistName);
        }
        
    } else if (updated.access_type === 'scheduled') {
      await sendNewCounselingEmail(toEmail, psName, patientName, date, time);
      await sendWhatsAppCounselingNotification(toPhone, psName, patientName, date, time);

      await sendPatientConfirmedScheduledEmail(patientEmail, patientName, psychologistName, date, time);
      if (patientPhone) {
        await sendWhatsAppPatientConfirmedScheduled(patientPhone, patientName, psychologistName, date, time);
      }
    }
  }

  if (lowerStatus === 'rejected') {
    const patientEmail = updated.patients.users.email;
    const patientName = updated.patients.users.name;
    const rejectionNote = updated.payment_note || 'Bukti pembayaran tidak sesuai atau tidak dapat diverifikasi';
    const patientPhone = updated.patients.users.phone_number;
  
    await sendPatientRejectedEmail(patientEmail, patientName, rejectionNote);
    if (patientPhone) {
      await sendWhatsAppPatientRejected(patientPhone, patientName, rejectionNote);
    }
      
    if (updated.access_type === 'scheduled') {
      const { data: bookedSchedule, error: selectError } = await supabase
        .from('booked_schedules')
        .select('id')
        .eq('counseling_id', updated.id)
        .maybeSingle();

      if (selectError) {
        throw new Error('Gagal memeriksa booked schedule: ' + selectError.message);
      }

      if (bookedSchedule) {
        const { error: deleteError } = await supabase
          .from('booked_schedules')
          .delete()
          .eq('counseling_id', updated.id);

        if (deleteError) {
          throw new Error('Gagal menghapus booked schedule: ' + deleteError.message);
        }
      } else {
        console.warn(`No booked schedule found for counseling_id: ${updated.id}`);
      }
    }
  }

  if (lowerStatus === 'refunded') {
    const patientEmail = updated.patients.users.email;
    const patientName = updated.patients.users.name;
    const patientPhone = updated.patients.users.phone_number;

    if (updated.access_type === 'scheduled') {
      const { data: bookedSchedule, error: selectError } = await supabase
        .from('booked_schedules')
        .select('id')
        .eq('counseling_id', updated.id)
        .maybeSingle();

      if (selectError) {
        throw new Error('Gagal memeriksa booked schedule: ' + selectError.message);
      }

      if (bookedSchedule) {
        const { error: deleteError } = await supabase
          .from('booked_schedules')
          .delete()
          .eq('counseling_id', updated.id);

        if (deleteError) {
          throw new Error('Gagal menghapus booked schedule: ' + deleteError.message);
        }
      } else {
        console.warn(`No booked schedule found for counseling_id: ${updated.id}`);
      }
    }
  
    await sendPatientRefundedEmail(patientEmail, patientName);
    if (patientPhone) {
      await sendWhatsAppPatientRefunded(patientPhone, patientName);
    }
  }  

  return {
    counseling_id: updated.id,
    patient_id: updated.patients.id,
    patient_name: updated.patients.users.name,
    patient_email: updated.patients.users.email,
    patient_phone_number: updated.patients.users.phone_number,
    psychologist_id: updated.psychologists.id,
    psychologist_name: updated.psychologists.users.name,
    payment_status: updated.payment_status,
    payment_note: updated.payment_note,
    status: updated.status,
  };
};

  
  
  
 

module.exports = { selectCounseling, changePaymentStatus }