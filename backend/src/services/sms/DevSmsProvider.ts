import { SmsOtpProvider, SmsSendResult } from './types';
import { logSecurityEvent } from '../../utils/security';

export class DevSmsProvider implements SmsOtpProvider {
  public name = 'DEV_MOCK_PROVIDER';

  async sendOtp(phone: string, otp: string): Promise<SmsSendResult> {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    logSecurityEvent('LOGIN_SUCCESS', {
      status: 'INFO',
      reason: `[DEV SMS DISPATCH] Verification code dispatched to +91 ${cleanPhone}`,
    });

    console.log(`[SMS OTP SERVICE] Dispatching SMS to +91 ${cleanPhone}`);

    return {
      success: true,
      messageId: `dev-msg-${Date.now()}`,
      message: `Development SMS simulated for +91 XXXXX ${cleanPhone.slice(-4)}.`,
    };
  }
}
