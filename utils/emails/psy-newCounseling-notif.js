const { sendEmail } = require('./mailer');

const sendNewCounselingEmail = async (toEmail, psychologistName, patientName, scheduleDate, scheduleTime) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: '🎉 Ada Sesi Konseling Baru Menanti Anda! 🌟',
        htmlContent: `
            <h2>Hai, ${psychologistName}! 😊</h2>
            <p>Semoga hari Anda penuh kebahagiaan! Kami punya kabar gembira yang pastinya akan membuat hari Anda semakin spesial:</p>
            <p><strong>Anda mendapatkan pasien baru untuk sesi konseling! 🎉</strong></p>
            
            <p><strong>Berikut detailnya:</strong></p>
            <ul>
                <li><strong>Nama Pasien:</strong> ${patientName}</li>
                <li><strong>Tanggal Konseling:</strong> ${scheduleDate}</li>
                <li><strong>Waktu Konseling:</strong> ${scheduleTime}</li>
            </ul>
            
            <p>Jangan lupa untuk menyiapkan diri dengan penuh semangat! Kami yakin sesi ini akan sangat berarti bagi pasien Anda. 💙</p>
            
            <p>Terima kasih sudah menjadi bagian dari perjalanan positif dalam dunia kesehatan mental! 🌿</p>
            <p>Semoga hari Anda luar biasa dan penuh kebahagiaan! ✨</p>
             <br/>
            <p>Salam semangat dari tim MentalWell! 🌈</p>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email notifikasi konseling berhasil dikirim ke:', toEmail);
}

const sendChatNowCounselingEmail = async (toEmail, psychologistName, patientName) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: '🚀 Konseling Real-Time Siap Dimulai Sekarang!',
      htmlContent: `
        <h2>Hai ${psychologistName}! 👋😊</h2>   
        <p>🎉 Kami punya kambar gembira! Ada pasien yang sedang <strong>menunggu sesi konseling secara real-time</strong> bersama Anda!</p>
        
        <ul>
          <li><strong>👤 Nama Pasien:</strong> ${patientName}</li>
          <li><strong>⏳ Durasi:</strong> Sekitar 1 jam</li>
        </ul>
  
        <p>💬 Silakan langsung masuk ke aplikasi dan mulai sesi percakapan dengan pasien. Jangan biarkan mereka menunggu terlalu lama ya~</p>
  
        <p>✨ Terima kasih sudah menjadi bagian dari perubahan positif dalam dunia kesehatan mental.</p>
        <p>💚 Semoga sesi Anda berjalan lancar, menyenangkan, dan penuh makna!</p>
        <br/>
        <p>Salam semangat dari tim MentalWell! 🌈</p>
      `
    };
  
    await sendEmail(mailOptions);
    console.log('📩 Notifikasi ceria Chat Now dikirim ke:', toEmail);
  };
  
  module.exports = {
    sendNewCounselingEmail,
    sendChatNowCounselingEmail
  };