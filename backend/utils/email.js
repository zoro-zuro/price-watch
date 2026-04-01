const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // use true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPriceAlertEmail(toEmail, productTitle, currentPrice) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'no-reply@pricewatch.com',
    to: toEmail,
    subject: `Price Drop Alert: ${productTitle}`,
    text: `Good news! The price of ${productTitle} has dropped to ₹${currentPrice}. Check it out now!`,
    html: `<p>Good news!</p><p>The price of <strong>${productTitle}</strong> has dropped to <strong>₹${currentPrice}</strong>.</p><p>Check it out now!</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Alert email sent to ${toEmail}`);
  } catch (err) {
    console.error('Failed to send email:', err.message);
  }
}

module.exports = { sendPriceAlertEmail };
