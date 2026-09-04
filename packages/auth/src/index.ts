import { createClient, type SupabaseClient, type AuthError, type User } from '@supabase/supabase-js';
import { AuthorizationError, ValidationError } from '@shiftos/errors';
import type { AuthSession, AuthUser } from '@shiftos/types';

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  /**
   * The app's own public origin (no trailing slash), used to send invitees to
   * /accept-invitation instead of Supabase's dashboard-configured Site URL
   * default. See AppConfig.SITE_URL's own doc comment for the incident this
   * fixes. Optional — inviteUser() falls back to Supabase's default when
   * absent rather than failing invitations outright.
   */
  siteUrl?: string;
}

export interface InviteUserResult {
  invitedEmail: string;
  /** id of the auth.users row created for the invitee, if the invite succeeded. */
  invitedUserId?: string;
}

export interface AuthenticationProvider {
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  refreshSession(): Promise<AuthSession | null>;
  requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
  /**
   * Confirms a password reset. `accessToken`/`refreshToken` are the tokens the
   * client extracted from the password-recovery redirect URL Supabase sent by
   * email; both are required to establish the recovery session before the
   * password update is applied.
   */
  confirmPasswordReset(accessToken: string, refreshToken: string, newPassword: string): Promise<void>;
  /**
   * firstName/lastName are optional since Task 3 (055) — the invite form no
   * longer collects the invitee's name (they set it themselves at
   * CompleteProfilePage after accepting). Passed through to Supabase Auth's
   * invite metadata only when supplied.
   */
  inviteUser(email: string, firstName: string | undefined, lastName: string | undefined, organizationId: string, roleId?: string): Promise<InviteUserResult>;
}

export class SupabaseAuthProvider implements AuthenticationProvider {
  private client: SupabaseClient;
  private serviceRoleKey?: string;
  private supabaseUrl: string;
  private siteUrl?: string;

  constructor(config: AuthConfig) {
    this.supabaseUrl = config.supabaseUrl;
    this.client = createClient(this.supabaseUrl, config.supabaseAnonKey);
    this.serviceRoleKey = config.supabaseServiceRoleKey;
    this.siteUrl = config.siteUrl;
  }

  private toAuthUser(user: User | null): AuthUser | null {
    if (!user) return null;

    // roles/permissions are intentionally left empty here: authentication
    // (identity) and authorization (what a user may do) are separate concerns
    // (ShiftOS DEC-018). A caller that needs roles/permissions should hydrate
    // them via the authorization/repositories packages using this user's id.
    return {
      id: user.id,
      auth_user_id: user.id,
      email: user.email,
      display_name: user.user_metadata?.name ?? null,
      roles: [],
      permissions: []
    };
  }

  private handleAuthError(error: AuthError | null): never {
    if (!error) {
      throw new AuthorizationError('Authentication provider returned an unexpected null error');
    }
    throw new AuthorizationError(error.message);
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      this.handleAuthError(error);
    }

    if (!data.session || !data.user) {
      throw new AuthorizationError('Authentication failed');
    }

    const user = this.toAuthUser(data.user);
    if (!user) {
      throw new AuthorizationError('Authenticated session returned invalid user details');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token ?? undefined,
      expires_at: data.session.expires_at ?? undefined,
      user
    };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      this.handleAuthError(error);
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error) {
      this.handleAuthError(error);
    }
    return this.toAuthUser(data.user);
  }

  async refreshSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.refreshSession();
    if (error) {
      this.handleAuthError(error);
    }
    if (!data.session || !data.user) {
      return null;
    }
    const user = this.toAuthUser(data.user);
    if (!user) {
      return null;
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token ?? undefined,
      expires_at: data.session.expires_at ?? undefined,
      user
    };
  }

  async requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Supabase does not report whether the email is registered (returns success
    // either way), so this call is already safe against account enumeration.
    const { error } = await this.client.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) {
      this.handleAuthError(error);
    }
  }

  async confirmPasswordReset(accessToken: string, refreshToken: string, newPassword: string): Promise<void> {
    if (!accessToken || !refreshToken || !newPassword) {
      throw new ValidationError('Reset token and new password are required');
    }

    // The recovery link Supabase emails the user carries a short-lived
    // access/refresh token pair, not a standalone "reset token" — updateUser()
    // always acts on whatever session is currently active on the client, so
    // that session must be established first via setSession().
    const { error: sessionError } = await this.client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (sessionError) {
      this.handleAuthError(sessionError);
    }

    const { error: updateError } = await this.client.auth.updateUser({ password: newPassword });
    if (updateError) {
      this.handleAuthError(updateError);
    }
  }

  private createAdminClient(): SupabaseClient {
    if (!this.serviceRoleKey) {
      throw new AuthorizationError('Service role key is required for administrative operations');
    }

    // persistSession/autoRefreshToken disabled: this client is short-lived,
    // constructed per privileged operation, and must never persist or refresh a
    // service-role session in whatever storage supabase-js would otherwise use.
    return createClient(this.supabaseUrl, this.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  async inviteUser(
    email: string,
    firstName: string | undefined,
    lastName: string | undefined,
    organizationId: string,
    roleId?: string
  ): Promise<InviteUserResult> {
    if (!email || !organizationId) {
      throw new ValidationError('Email and organization ID are required');
    }

    const adminClient = this.createAdminClient();
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { firstName, lastName, organizationId, roleId },
      // Without this, Supabase Auth falls back to the project's dashboard-
      // configured Site URL, which is not guaranteed (and in production, was
      // confirmed NOT) to be /accept-invitation -- see AuthConfig.siteUrl.
      ...(this.siteUrl ? { redirectTo: `${this.siteUrl}/accept-invitation` } : {})
    });

    if (error) {
      this.handleAuthError(error);
    }

    return {
      invitedEmail: email,
      invitedUserId: data.user?.id
    };
  }
}
