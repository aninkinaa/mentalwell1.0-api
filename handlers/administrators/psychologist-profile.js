const { addPsychologist,editPsychologist, psychologistDetails } = require('../../services/administrators/psychologist-profile')
const { ClientError, ValidationError } = require('../../utils/errors')
const { addPsychologistSchema } = require('../../utils/validation')

const postPsychologist = async (request, h) => {
  try {
    const payload = request.payload;

    const {
      name, nickname, email, phone_number, birthdate, gender, password,
      bio, experience, price
    } = payload;

   const profileImage = payload.profile_image && payload.profile_image._data ? payload.profile_image : null;

    console.log(profileImage, 'profileImage');

    const userData = { name, nickname, email, phone_number, birthdate, gender, password };
    const psychologistData = { bio, experience, price };
    const parsedTopics = typeof payload.topics === 'string' ? JSON.parse(payload.topics) : payload.topics;
    let parsedSchedules = [];
    try {
      parsedSchedules = typeof payload.schedules === 'string' ? JSON.parse(payload.schedules) : payload.schedules;
    } catch (e) {
      throw new ValidationError('Format schedules tidak valid. Harus JSON array');
    }

    const { error } = addPsychologistSchema.validate(userData);
    if (error) throw new ValidationError(error.message);

    const result = await addPsychologist(userData, psychologistData, parsedTopics, parsedSchedules, profileImage);

    return h.response({
      status: 'success',
      message: result.message,
      psychologist: result
    }).code(201);
  } catch (err) {
    console.error('❌ postPsychologist error:', err.message);
    const statusCode = err.statusCode || 500;
    const message = err instanceof ClientError ? err.message : 'Terjadi kesalahan server';
    return h.response({ status: 'fail', message }).code(statusCode);
  }
};

  const putPsychologistInfo = async (request, h) => {
    try {
        const userId = request.params.id;
        const payload = request.payload;
        const file = payload.profile_image && payload.profile_image._data
        ? payload.profile_image
        : null;

    
        const result = await editPsychologist(userId, payload, file);
    
        return h.response({
          status: 'success',
          message: result.message,
          data: result.data
        }).code(200);
      } catch (err) {
        console.error('❌ editPsychologistHandler error:', err);
        return h.response({
          status: 'fail',
          message: err.message || 'Terjadi kesalahan server'
        }).code(err.statusCode || 500);
      }
  };

  const getPsychologistDetails = async (request, h) => {
    try {
        const psychologistId = request.params.id;
        const psychologist = await psychologistDetails(psychologistId);
    
        return h.response({
          status: 'success',
          message: 'Berhasil mengambil detail psikolog',
          data: psychologist
        }).code(200);
      } catch (err) {
        console.error('❌ getPsychologistDetails error:', err.message);
        const statusCode = err.statusCode || 500;
        return h.response({
          status: 'fail',
          message: err instanceof ClientError ? err.message : 'Terjadi kesalahan server'
        }).code(statusCode);
      }
  }

module.exports = {
    postPsychologist, putPsychologistInfo, getPsychologistDetails
};
  