const axios = require('axios');
require('dotenv').config();

const sendEmail = async ({ to, subject, htmlContent }) => {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: 'MentalWell 1.0',
          email: process.env.EMAIL_USER
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    console.log('✅ Email terkirim:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Gagal kirim email:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendEmail };
