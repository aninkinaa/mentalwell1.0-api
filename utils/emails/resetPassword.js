const { sendEmail } = require('./mailer');

const sendPasswordResetEmail = async (toEmail, resetLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: '🔐 Reset Password Akun MentalWell',
    html: `
      <h2>Hai! 👋</h2>
      <p>Kami menerima permintaan untuk mengatur ulang password akun kamu yang terdaftar dengan email ini.</p>
      <p>Klik tombol di bawah ini untuk mengatur ulang password kamu:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" style="
          display: inline-block;
          padding: 10px 20px;
          font-size: 16px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        ">Reset Password</a>
      </p>
      <p>Jika kamu tidak merasa meminta reset password, kamu bisa abaikan email ini.</p>
      <br/>
      <p>Link akan kadaluarsa dalam 1 jam.</p>
      <br/>
      <p>Terima kasih,</p>
      <p>Tim MentalWell 🌿</p>
    `
  };

  await sendEmail(mailOptions);
  console.log('📨 Link reset password dikirim ke:', toEmail);
};

module.exports = { sendPasswordResetEmail };