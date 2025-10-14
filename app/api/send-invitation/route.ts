import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Check if Resend API key is configured
if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not configured. Email invitations will not work.')
}

export async function POST(request: NextRequest) {
  try {
    const { 
      collaboratorId, 
      inviterName, 
      inviterEmail, 
      playbookTitle, 
      permissionLevel, 
      invitedEmail 
    } = await request.json()

    // Validate required fields
    if (!collaboratorId || !inviterName || !inviterEmail || !playbookTitle || !invitedEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate permission level
    if (!['owner', 'edit', 'view'].includes(permissionLevel)) {
      return NextResponse.json(
        { error: 'Invalid permission level' },
        { status: 400 }
      )
    }

    // Create the invitation acceptance URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const acceptUrl = `${baseUrl}/invite/${collaboratorId}`

    // Create the HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Collaboration Invitation - Playbooq.AI</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .footer {
              background: #f9fafb;
              padding: 20px 30px;
              text-align: center;
              border-radius: 0 0 8px 8px;
              border: 1px solid #e5e7eb;
              border-top: none;
              font-size: 14px;
              color: #6b7280;
            }
            .cta-button {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .permission-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .permission-owner {
              background: #fef3c7;
              color: #92400e;
            }
            .permission-edit {
              background: #dbeafe;
              color: #1e40af;
            }
            .permission-view {
              background: #f3f4f6;
              color: #374151;
            }
            .info-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 16px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🤝 Collaboration Invitation</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to collaborate on a playbook</p>
          </div>
          
          <div class="content">
            <p>Hi there!</p>
            
            <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to collaborate on the playbook:</p>
            
            <div class="info-box">
              <h3 style="margin: 0 0 8px 0; font-size: 18px;">📋 ${playbookTitle}</h3>
              <p style="margin: 0;">
                Permission Level: 
                <span class="permission-badge permission-${permissionLevel}">
                  ${permissionLevel === 'owner' ? '👑 Owner' : permissionLevel === 'edit' ? '✏️ Edit' : '👁️ View'}
                </span>
              </p>
            </div>

            <p>
              ${permissionLevel === 'owner' 
                ? 'As an owner, you\'ll have full access to the playbook, including the ability to manage other collaborators.'
                : permissionLevel === 'edit'
                ? 'With edit permissions, you can view and modify the playbook content.'
                : 'With view permissions, you can read and review the playbook content.'
              }
            </p>

            <div style="text-align: center;">
              <a href="${acceptUrl}" class="cta-button">
                Accept Invitation
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              <strong>Don't have an account?</strong> No problem! You can sign up for Playbooq.AI when you click the accept button above.
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 0;">
              This invitation was sent by Playbooq.AI.<br>
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `

    // Send the email
    console.log('Attempting to send email to:', invitedEmail)
    console.log('Using Resend API key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing')
    
    const { data, error } = await resend.emails.send({
      from: 'Playbooq.AI <noreply@playbooq.ai>',
      to: [invitedEmail],
      subject: `${inviterName} invited you to collaborate on '${playbookTitle}'`,
      html: htmlContent,
    })

    if (error) {
      console.error('Resend error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: `Failed to send invitation email: ${error.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    console.log('Email sent successfully:', data?.id)

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'Invitation sent successfully'
    })

  } catch (error: any) {
    console.error('Send invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

