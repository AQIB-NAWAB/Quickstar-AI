export type CapturedEmail = {
  to: string;
  subject: string;
  url: string;
  sentAt: Date;
};

export interface EmailDeliveryService {
  sendPasswordReset(to: string, resetUrl: string): Promise<{ delivered: boolean; error?: string }>;
  getCapturedEmails(): CapturedEmail[];
  getLastEmail(): CapturedEmail | undefined;
  clearCaptured(): void;
}

export class MemoryEmailDeliveryService implements EmailDeliveryService {
  private captured: CapturedEmail[] = [];

  async sendPasswordReset(to: string, resetUrl: string): Promise<{ delivered: boolean; error?: string }> {
    if (process.env.NODE_ENV === "production" && !process.env.SMTP_HOST && !process.env.RESEND_API_KEY) {
      return {
        delivered: false,
        error: "Production email delivery adapter not configured",
      };
    }

    const email: CapturedEmail = {
      to,
      subject: "Reset your QuickStart AI password",
      url: resetUrl,
      sentAt: new Date(),
    };
    this.captured.push(email);
    return { delivered: true };
  }

  getCapturedEmails(): CapturedEmail[] {
    return [...this.captured];
  }

  getLastEmail(): CapturedEmail | undefined {
    return this.captured[this.captured.length - 1];
  }

  clearCaptured(): void {
    this.captured = [];
  }
}

export const emailDelivery = new MemoryEmailDeliveryService();
