export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    plan: 'free' | 'pro' | 'premium';
    systemRole: 'user' | 'support' | 'admin' | 'super_admin';
    emailVerified: boolean;
  };
}
