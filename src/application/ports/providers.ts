export type AuthUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  fullName?: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export interface AuthProvider {
  signUp(input: SignUpInput): Promise<AuthSession>;
  signIn(input: SignInInput): Promise<AuthSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
}

export type UploadedObject = {
  path: string;
  url: string;
  contentType: string;
  size: number;
};

export type UploadObjectInput = {
  storeId: string;
  folder: "products" | "stores" | "avatars";
  fileName: string;
  contentType: string;
  data: ArrayBuffer | Buffer | Blob;
};

export interface StorageProvider {
  upload(input: UploadObjectInput): Promise<UploadedObject>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}

export type CheckoutSessionInput = {
  storeId: string;
  planId: "basic" | "pro";
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId?: string | null;
};

export type CheckoutSessionResult = {
  url: string;
  sessionId: string;
};

export interface PaymentProvider {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  cancelSubscription(stripeSubscriptionId: string): Promise<void>;
  constructWebhookEvent(payload: string, signature: string): Promise<unknown>;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
