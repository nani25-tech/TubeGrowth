import nodemailer from 'nodemailer';

let transporter;

const initializeMailer = () => {
  if (transporter) return transporter;

  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = parseInt(process.env.EMAIL_PORT || '587');
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  return transporter;
};

export const sendEmail = async (to, subject, html) => {
  try {
    const mailer = initializeMailer();
    const fromName = process.env.EMAIL_FROM_NAME || 'TubeGrowth';

    const result = await mailer.sendMail({
      from: `${fromName} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (email, verificationLink) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #FF0000; color: white; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
    </div>
  `;

  return sendEmail(email, 'Verify Your Email - TubeGrowth', html);
};

export const sendPasswordResetEmail = async (email, resetLink) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #FF0000; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p>This link expires in 1 hour.</p>
    </div>
  `;

  return sendEmail(email, 'Reset Your Password - TubeGrowth', html);
};

export const sendWelcomeEmail = async (email, name) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to TubeGrowth, ${name}!</h2>
      <p>Thank you for joining TubeGrowth. You're now part of our community of YouTube creators.</p>
      <p>Get started by logging in and creating your first campaign!</p>
    </div>
  `;

  return sendEmail(email, 'Welcome to TubeGrowth!', html);
};
