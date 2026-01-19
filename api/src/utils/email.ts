import { Resend } from 'resend';

// Initialize Resend - will be null if API key not configured
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'Obelisk Portal <noreply@obelisk.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an invitation email to a new employee
 */
export async function sendInvitationEmail(
  to: string,
  name: string,
  role: string,
  token: string,
  inviterName?: string
): Promise<SendEmailResult> {
  if (!resend) {
    console.log('[Email] Resend not configured - skipping email');
    console.log(`[Email] Would send invitation to ${to}`);
    console.log(`[Email] Link: ${FRONTEND_URL}/accept-invitation/${token}`);
    return { success: true, error: 'Email service not configured' };
  }

  const invitationLink = `${FRONTEND_URL}/accept-invitation/${token}`;
  
  const roleLabel = {
    admin: 'Administrator',
    hr: 'HR Manager',
    employee: 'Employee',
  }[role] || 'Employee';

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You're invited to join Obelisk Portal`,
      html: getInvitationEmailHtml(name, roleLabel, invitationLink, inviterName),
      text: getInvitationEmailText(name, roleLabel, invitationLink, inviterName),
    });

    if (error) {
      console.error('[Email] Failed to send invitation:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Invitation sent to ${to}, ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Email] Error sending invitation:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * HTML template for invitation email
 */
function getInvitationEmailHtml(
  name: string,
  role: string,
  invitationLink: string,
  inviterName?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Obelisk Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 560px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; background-color: #0a0a0a; border-radius: 12px; padding: 12px 24px;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">Obelisk Portal</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #0a0a0a; text-align: center;">
                You're Invited!
              </h1>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #404040;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #404040;">
                ${inviterName ? `${inviterName} has invited you` : 'You have been invited'} to join <strong>Obelisk Portal</strong> as a <strong>${role}</strong>.
              </p>
              
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #404040;">
                Click the button below to complete your registration and set up your account.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${invitationLink}" style="display: inline-block; background-color: #0a0a0a; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0; font-size: 14px; line-height: 1.6; color: #737373;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
              
              <!-- Link fallback -->
              <div style="margin-top: 24px; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #737373;">
                  If the button doesn't work, copy and paste this link:
                </p>
                <p style="margin: 0; font-size: 12px; word-break: break-all;">
                  <a href="${invitationLink}" style="color: #0a0a0a;">${invitationLink}</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
                © ${new Date().getFullYear()} Obelisk Portal. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Plain text version of invitation email
 */
function getInvitationEmailText(
  name: string,
  role: string,
  invitationLink: string,
  inviterName?: string
): string {
  return `
Hi ${name},

${inviterName ? `${inviterName} has invited you` : 'You have been invited'} to join Obelisk Portal as a ${role}.

Click the link below to complete your registration and set up your account:

${invitationLink}

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.

---
© ${new Date().getFullYear()} Obelisk Portal. All rights reserved.
`.trim();
}
