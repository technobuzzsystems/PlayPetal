export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

export interface SmsOtpProvider {
  name: string;
  sendOtp(phone: string, otp: string): Promise<SmsSendResult>;
}
