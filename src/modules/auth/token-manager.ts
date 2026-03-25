import { env } from '../../config/env';
import { httpRequest } from '../../lib/http';
import { MLOAuthTokenResponse } from '../../types/mercadolibre';

export class TokenManager {
  private accessToken: string = env.ML_ACCESS_TOKEN;
  private refreshToken: string = env.ML_REFRESH_TOKEN;
  private refreshedInRuntime = false;

  getAccessToken(): string {
    return this.accessToken;
  }

  wasRefreshedInRuntime(): boolean {
    return this.refreshedInRuntime;
  }

  async refreshAccessToken(): Promise<MLOAuthTokenResponse> {
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('client_id', env.ML_CLIENT_ID);
    form.set('client_secret', env.ML_CLIENT_SECRET);
    form.set('refresh_token', this.refreshToken);

    const response = await httpRequest<MLOAuthTokenResponse>(env.ML_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: form.toString()
    });

    this.accessToken = response.access_token;
    if (response.refresh_token) {
      this.refreshToken = response.refresh_token;
    }
    this.refreshedInRuntime = true;

    return response;
  }
}
