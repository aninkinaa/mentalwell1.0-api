const { sendEmail } = require('./mailer')

const sendPatientConfirmedScheduledEmail = async (toEmail, patientName, psychologistName, date, time) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: '✅ Pembayaran Kamu Sudah Dikonfirmasi!',
      htmlContent: `
        <h2>Hai, ${patientName}! 👋</h2>
        <p>Terima kasih telah melakukan pembayaran untuk sesi konseling kamu.</p>
        <p>Pembayaranmu sudah <strong>dikonfirmasi</strong> dan sesi kamu dijadwalkan sebagai berikut:</p>
        <ul>
          <li><strong>Psikolog:</strong> ${psychologistName}</li>
          <li><strong>Tanggal:</strong> ${date}</li>
          <li><strong>Waktu:</strong> ${time}</li>
        </ul>
        <p>📌 Jangan lupa hadir sesuai jadwal ya! Jika ada kendala, kamu bisa menghubungi tim kami melalui email mentalwell.contact1@gmail.com.</p>
        <br/>
        <p>Terima kasih sudah mempercayakan perjalanan mentalmu bersama MentalWell! 💙</p>
        <p>Salam hangat,</p>
        <p>Tim MentalWell 🌿</p>
      `
    };
  
    await sendEmail(mailOptions);
    console.log('📨 Email konfirmasi untuk pasien (scheduled) dikirim ke:', toEmail);
  };
  
  const sendPatientConfirmedRealtimeEmail = async (toEmail, patientName, psychologistName) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: '🚀 Sesi Konseling Kamu Sudah Siap!',
      htmlContent: `
        <h2>Hai, ${patientName}! 👋</h2>
        <p>Pembayaran kamu telah dikonfirmasi dan sesi <strong>konseling real-time</strong> sekarang siap dimulai!</p>
        <p>✨ Psikolog kamu <strong>${psychologistName}</strong> sudah menerima notifikasi untuk memulai percakapan.</p>
        <p>Silakan masuk ke aplikasi dan bersiap untuk memulai sesi kamu. Kami berharap sesi ini memberikan kenyamanan dan semangat baru untuk kamu. 💙</p>
        <br/>
        <p>Salam hangat,</p>
        <p>Tim MentalWell 🌿</p>
      `
    };
  
    await sendEmail(mailOptions);
    console.log('📨 Email konfirmasi untuk pasien (real-time) dikirim ke:', toEmail);
  };
  
  const sendPatientRejectedEmail = async (toEmail, patientName, reason) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: '⚠️ Pembayaran Kamu Ditolak',
      htmlContent: `
        <h2>Halo, ${patientName}! 👋</h2>
        <p>Kami ingin menginformasikan bahwa pembayaran yang kamu ajukan <strong>tidak dapat kami proses</strong>.</p>
        <p><strong>Alasan Penolakan:</strong> ${reason}</p>
        <p>💡 Jika kamu merasa ini adalah kesalahan atau sudah melakukan pembayaran, silakan hubungi tim kami melalui email mentalwell.contact1@gmail.com.</p>
        <br/>
        <p>Jangan khawatir! Kamu masih bisa menjadwalkan ulang sesi konseling.</p>
        <p>Terima kasih atas pengertian dan kerjasamanya 💙</p>
        <p>Salam hangat,</p>
        <p>Tim MentalWell 🌿</p>
      `
    };
  
    await sendEmail(mailOptions);
    console.log('📨 Email penolakan pembayaran dikirim ke:', toEmail);
  };

  const sendPatientRefundedEmail = async (toEmail, patientName) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: '💸 Pengembalian Dana Konseling Kamu Telah Diproses',
      htmlContent: `
        <h2>Halo ${patientName}! 😊</h2>
        <p>Kami ingin mengabari bahwa pembayaran kamu untuk sesi konseling yang sebelumnya tidak dapat dilanjutkan, <strong>telah berhasil kami kembalikan</strong> ke rekening kamu.</p>
        
        <p>💰 <strong>Status:</strong> Refund Berhasil</p>
        <p>📝 Dana telah dikembalikan sesuai dengan metode pembayaran yang kamu gunakan.</p>
  
        <p>Kami mohon maaf atas ketidaknyamanan yang terjadi. Jika kamu ingin menjadwalkan ulang sesi konseling, kamu bisa melakukannya kapan saja melalui aplikasi kami.</p>
  
        <p>Terima kasih atas pengertian dan kepercayaan kamu pada MentalWell. 💙</p>
        <br/>
        <p>Semoga hari kamu menyenangkan!</p>
        <p>Salam hangat,</p>
        <p>Tim MentalWell 🌿</p>
      `
    };
  
    await sendEmail(mailOptions);
    console.log('📨 Email refund berhasil dikirim ke:', toEmail);
  };

  module.exports = {
    sendPatientConfirmedScheduledEmail,
    sendPatientConfirmedRealtimeEmail,
    sendPatientRejectedEmail,
    sendPatientRefundedEmail
  };
  