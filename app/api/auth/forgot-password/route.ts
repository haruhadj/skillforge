import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getAdminAuth } from '@/app/lib/firebase-admin'
import { rateLimit, clientIpFrom, sweepExpired } from '@/app/lib/rateLimit'

// Lazy Resend initialization
function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }
  return new Resend(apiKey)
}

// Throttle the reset-email endpoint to stop email-bombing a victim and burning the
// Resend quota: cap per client IP and per target email address.
const IP_LIMIT = 5
const IP_WINDOW_MS = 15 * 60 * 1000
const EMAIL_LIMIT = 3
const EMAIL_WINDOW_MS = 60 * 60 * 1000

function tooMany(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  )
}

export async function POST(request: NextRequest) {
  try {
    sweepExpired()

    const ip = clientIpFrom(request)
    const ipLimit = rateLimit(`forgot-pw:ip:${ip}`, IP_LIMIT, IP_WINDOW_MS)
    if (!ipLimit.allowed) {
      return tooMany(ipLimit.retryAfterSeconds)
    }

    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailLimit = rateLimit(
      `forgot-pw:email:${email.trim().toLowerCase()}`,
      EMAIL_LIMIT,
      EMAIL_WINDOW_MS
    )
    if (!emailLimit.allowed) {
      // Generic success-shaped 429 avoids leaking whether the address exists.
      return tooMany(emailLimit.retryAfterSeconds)
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Generate password reset link using Firebase Admin
    // actionCodeSettings.url must match the sending domain to avoid spam filters
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://olacqr.dpdns.org'
    const firebaseLink = await getAdminAuth().generatePasswordResetLink(email, {
      url: `${appUrl}/login`,
    })

    // Replace Firebase's action domain with our own so the link in the email
    // matches the sending domain (firebaseapp.com triggers rspamd spam filters).
    // /auth/action proxies the params back to Firebase for actual processing.
    const resetLink = firebaseLink.replace(
      'https://skillforge-7a058.firebaseapp.com/__/auth/action',
      `${appUrl}/auth/action`
    )

    // Send email via Resend
    const { data, error } = await getResend().emails.send({
      from: 'SkillForge <support@haruhadj.org>',
      to: email,
      subject: 'Reset your SkillForge password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>We received a request to reset your SkillForge password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetLink}</p>
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            If you didn't request this password reset, you can safely ignore this email. The link will expire in 1 hour.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">
            This email was sent from SkillForge. Questions? Reply to this email or contact support.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Forgot password error:', error)
    
    // Don't reveal if email exists or not for security
    if (error instanceof Error && error.message.includes('user-not-found')) {
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
