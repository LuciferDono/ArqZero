import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'ArqZero <noreply@arqzero.dev>';

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `ArqZero verification code: ${code}`,
    html: `
      <div style="font-family: 'Cascadia Code', monospace; background: #1a1a1a; color: #D4D4D4; padding: 40px; border-radius: 8px;">
        <h1 style="color: #00D4AA; margin: 0 0 24px;">◆ ArqZero</h1>
        <p>Your verification code:</p>
        <div style="background: #0d1117; padding: 20px; border-radius: 6px; border-left: 3px solid #00D4AA; margin: 16px 0;">
          <span style="font-size: 32px; letter-spacing: 8px; color: #00D4AA; font-weight: bold;">${code}</span>
        </div>
        <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendTeamInviteEmail(
  inviteeEmail: string,
  ownerEmail: string,
  ownerId: string,
): Promise<void> {
  const acceptUrl = `${process.env.FRONTEND_URL ?? 'https://arqzero.dev'}/team/accept?owner=${ownerId}`;
  await resend.emails.send({
    from: FROM,
    to: inviteeEmail,
    subject: `You've been invited to an ArqZero Team`,
    html: `
      <div style="font-family: 'Cascadia Code', monospace; background: #1a1a1a; color: #D4D4D4; padding: 40px; border-radius: 8px;">
        <h1 style="color: #00D4AA; margin: 0 0 24px;">◆ ArqZero</h1>
        <p>${ownerEmail} has invited you to their ArqZero Team.</p>
        <p>Team members get access to all Pro features plus shared team memory.</p>
        <a href="${acceptUrl}" style="display:inline-block; background:#00D4AA; color:#1a1a1a; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; margin-top:16px;">Accept Invite</a>
        <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">If you don't have an account, create one at arqzero.dev first.</p>
      </div>
    `,
  });
}
