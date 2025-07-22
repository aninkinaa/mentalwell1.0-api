const { supabase } = require('../../config/database')
const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors')
const { calculateAge } = require('../../utils/calculateAge')

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const viewPsychologistCounselings = async (userId) => {
    const { data: psychologist } = await supabase
        .from('psychologists')
        .select('id')
        .eq('user_id', userId)
        .single();

    const { data: counselings, error } = await supabase
        .from('counselings')
        .select(`
            *,
            patients (
                users (
                    name,
                    profile_image
                )
            )
        `)
        .eq('psychologist_id', psychologist.id)
        .eq('payment_status', 'approved');

    if (error) {
        throw new Error('Gagal mengambil data konseling: ' + error.message);
    }

    const now = dayjs().tz('Asia/Jakarta');
    const formatted = counselings
        .map(c => {
            return {
                id: c.id,
                patient_id: c.patient_id,
                patient_name: c.patients?.users?.name || '-',
                patient_profpic: c.patients?.users?.profile_image || null,
                schedule_date: c.schedule_date,
                start_time: c.start_time,
                end_time: c.end_time,
                schedule_time: c.start_time && c.end_time
                    ? `${c.start_time.slice(0, 5)}-${c.end_time.slice(0, 5)}`
                    : '-',
                status: c.status,
                access_type: c.access_type,
                created_at: c.created_at,
            };
        })
        .sort((a, b) => {
            const startTimeA = dayjs(`${a.schedule_date}T${a.start_time}`).tz('Asia/Jakarta');
            const startTimeB = dayjs(`${b.schedule_date}T${b.start_time}`).tz('Asia/Jakarta');
            return startTimeA.diff(now) - startTimeB.diff(now);
        });

    return formatted;
};



const selectCounseling = async (counselingId) => {
    const { data: counseling, error: counsError } = await supabase
    .from('counselings')
    .select(`
        id,
        schedule_date,
        start_time,
        end_time,
        occupation,
        problem_description,
        hope_after,
        status,
        created_at,
        conversation_id,
        patients (
            users (
                name,
                nickname,
                profile_image,
                birthdate,
                gender
            )
        )
    `)
    .eq('id', counselingId)
    .single()
    
    if (counsError) {
        if(counsError.message.includes('multiple (or no) rows returned')){
            throw new NotFoundError('Tidak ditemukan data konseling terkait')
        }
        throw new Error('Terjadi kesalahan: ' + (counsError.message || 'Unknown error'))
    }

    const detailedCounseling = {
        id: counseling.id,
        conversation_id: counseling.conversation_id,
        name: counseling.patients.users.name,
        nickname: counseling.patients.users.nickname,
        birthdate: counseling.patients.users.birthdate,
        profile_image: counseling.patients.users.profile_image,
        age: calculateAge(counseling.patients.users.birthdate),
        gender: counseling.patients.users.gender,
        schedule_date: counseling.schedule_date,
        schedule_time: counseling.start_time.slice(0,5) + '-' + counseling.end_time.slice(0, 5),
        occupation: counseling.occupation,
        problem_description: counseling.problem_description,
        hope_after: counseling.hope_after,
        status: counseling.status,
        created_at: counseling.created_at
    }

    return detailedCounseling
}

const changeCounselingStatus = async (counselingId, updatedStatus) => {
    const { data: status, error: statusError } = await supabase
      .from('counselings')
      .select('status')
      .eq('id', counselingId)
      .single();

    if (statusError) {
        if (statusError.message.includes('multiple (or no) rows returned')) {
            throw new NotFoundError('Konseling tidak ditemukan');
        }
        throw new Error('Gagal mengambil data konseling: ' + statusError.message);
    }

    const currentStatus = status.status?.toLowerCase();

    if (['finished'].includes(currentStatus)) {
        throw new ConflictError('Status sudah final, tidak dapat diubah kembali');
    }
    
    if (currentStatus === 'waiting') {
        throw new ValidationError('Konseling belum dimulai, belum bisa mengubah status konseling');
    }

    const { data: counseling, error: counsError } = await supabase
      .from('counselings')
      .update({ status: updatedStatus })
      .eq('id', counselingId)

    if (counsError) {
        throw new Error('Gagal mengupdate status konseling: ' + counsError.message);
    }

    const {error: convoError} = await supabase
      .from('conversations')
      .update({status : "closed"})
      .eq('id', counseling.conversation_id)

    if (convoError) {
        throw new Error('Gagal mengupdate status percakapan: ' + convoError.message);
    }

    const updatedCounseling = {
        id: counseling.id,
        name: counseling.patients.users.name,
        nickname: counseling.patients.users.nickname,
        birthdate: counseling.patients.users.birthdate,
        age: calculateAge(counseling.patients.users.birthdate),
        gender: counseling.patients.users.gender,
        schedule_date: counseling.schedule_date,
        schedule_time: `${counseling.start_time.slice(0, 5)}-${counseling.end_time.slice(0, 5)}`,
        occupation: counseling.occupation,
        problem_description: counseling.problem_description,
        hope_after: counseling.hope_after,
        status: counseling.status,
        created_at: counseling.created_at
    };

    return updatedCounseling;
}


module.exports = { viewPsychologistCounselings, selectCounseling, changeCounselingStatus }