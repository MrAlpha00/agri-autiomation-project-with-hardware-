import { NextResponse } from 'next/server';
import { isEnvConfigured } from '@/lib/env';


export async function POST(req: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Check if variables are properly configured on the server runtime
    if (!isEnvConfigured(botToken)) {
      return NextResponse.json(
        {
          success: false,
          error: 'TELEGRAM_BOT_TOKEN is not configured or is set to a template placeholder in server environment variables.',
          hint: 'Set TELEGRAM_BOT_TOKEN in Vercel Project Settings -> Environment Variables, then redeploy.',
        },
        { status: 400 }
      );
    }

    if (!isEnvConfigured(chatId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'TELEGRAM_CHAT_ID is not configured or is set to a template placeholder in server environment variables.',
          hint: 'Set TELEGRAM_CHAT_ID in Vercel Project Settings -> Environment Variables, then redeploy.',
        },
        { status: 400 }
      );
    }

    // Parse optional custom message from body
    let userMessage = '';
    try {
      const body = await req.json();
      if (body && typeof body.message === 'string') {
        userMessage = body.message;
      }
    } catch {
      // Body is optional
    }

    const timestamp = new Date().toISOString();
    const telegramText = userMessage
      ? `<b>🌱 AgriSense IoT Test Alert</b>\n\n${userMessage}\n\n⏱ <i>${timestamp}</i>`
      : `<b>🌱 AgriSense IoT Test Notification</b>\n\n` +
        `✅ <b>Backend Status:</b> Runtime Environment Connected\n` +
        `⏱ <b>Server Time:</b> <code>${timestamp}</code>\n` +
        `📡 <b>Integration:</b> Telegram Bot API is operational.\n\n` +
        `<i>Smart Agriculture IoT Farm Unit #1</i>`;

    // Dispatch message to Telegram Bot API
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramText,
        parse_mode: 'HTML',
      }),
    });

    const telegramData = await telegramRes.json();

    if (!telegramRes.ok || !telegramData.ok) {
      const errorMsg = telegramData.description || `HTTP ${telegramRes.status}`;
      return NextResponse.json(
        {
          success: false,
          error: `Telegram Bot API error: ${errorMsg}`,
          statusCode: telegramRes.status,
        },
        { status: 502 }
      );
    }

    // Success response - never leak the token!
    return NextResponse.json({
      success: true,
      message: 'Telegram test message sent successfully.',
      messageId: telegramData.result?.message_id,
      timestamp,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to dispatch Telegram message: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
