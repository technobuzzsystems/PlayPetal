import { SmsOtpProvider, SmsSendResult } from './types';

export class Fast2SmsProvider implements SmsOtpProvider {
  public name = 'FAST2SMS';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendOtp(phone: string, otp: string): Promise<SmsSendResult> {
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const url = 'https://www.fast2sms.com/dev/bulkV2';

      // Primary attempt: POST JSON request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: cleanPhone,
        }),
      });

      const data = (await response.json()) as any;

      if (response.ok && data.return === true) {
        return {
          success: true,
          messageId: data.request_id || undefined,
          message: 'SMS dispatched successfully via Fast2SMS API.',
        };
      }

      // Secondary fallback attempt: GET query parameters
      const getUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(this.apiKey)}&route=otp&variables_values=${encodeURIComponent(otp)}&flash=0&numbers=${encodeURIComponent(cleanPhone)}`;
      const getRes = await fetch(getUrl, { method: 'GET' });
      const getData = (await getRes.json()) as any;

      if (getRes.ok && getData.return === true) {
        return {
          success: true,
          messageId: getData.request_id || undefined,
          message: 'SMS dispatched successfully via Fast2SMS GET API.',
        };
      }

      return {
        success: false,
        error: data?.message?.[0] || data?.message || getData?.message?.[0] || getData?.message || 'Fast2SMS dispatch failed.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to connect to Fast2SMS gateway.',
      };
    }
  }
}
