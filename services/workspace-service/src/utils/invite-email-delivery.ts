export type CapturedInviteEmail = {
  to: string;
  subject: string;
  url: string;
  role: string;
  sentAt: Date;
};

export interface InviteEmailDeliveryService {
  sendWorkspaceInvite(
    to: string,
    inviteUrl: string,
    role: string,
  ): Promise<{ delivered: boolean; error?: string }>;
  getCapturedEmails(): CapturedInviteEmail[];
  getLastEmail(): CapturedInviteEmail | undefined;
  clearCaptured(): void;
}

export class MemoryInviteEmailDeliveryService implements InviteEmailDeliveryService {
  private captured: CapturedInviteEmail[] = [];

  async sendWorkspaceInvite(
    to: string,
    inviteUrl: string,
    role: string,
  ): Promise<{ delivered: boolean; error?: string }> {
    if (process.env.NODE_ENV === "production" && !process.env.SMTP_HOST && !process.env.RESEND_API_KEY) {
      return {
        delivered: false,
        error: "Production email delivery adapter not configured",
      };
    }

    const email: CapturedInviteEmail = {
      to,
      subject: `You've been invited to join a QuickStart AI workspace as ${role}`,
      url: inviteUrl,
      role,
      sentAt: new Date(),
    };
    this.captured.push(email);
    return { delivered: true };
  }

  getCapturedEmails(): CapturedInviteEmail[] {
    return [...this.captured];
  }

  getLastEmail(): CapturedInviteEmail | undefined {
    return this.captured[this.captured.length - 1];
  }

  clearCaptured(): void {
    this.captured = [];
  }
}

export const inviteEmailDelivery = new MemoryInviteEmailDeliveryService();
