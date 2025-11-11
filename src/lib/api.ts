const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

class APIClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Preview storage helpers (used only in Lovable preview mode)
  private previewGet(key: string): any[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private previewSet(key: string, items: any[]) {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // no-op
    }
  }

  private previewGetGroups() {
    const groups = this.previewGet('preview_groups');
    return groups;
  }

  private previewCreateGroup(data: any) {
    const groups = this.previewGet('preview_groups');
    const newGroup = {
      id: (crypto as any)?.randomUUID?.() || String(Date.now()),
      name: data.name ?? `Group ${groups.length + 1}`,
      description: data.description ?? '',
      color: data.color ?? '#8884d8',
      created_at: new Date().toISOString(),
    };
    groups.push(newGroup);
    this.previewSet('preview_groups', groups);
    return newGroup;
  }

  private previewGetServers() {
    const servers = this.previewGet('preview_servers');
    return servers;
  }

  private previewCreateServer(data: any) {
    const servers = this.previewGet('preview_servers');
    const newServer = {
      id: (crypto as any)?.randomUUID?.() || String(Date.now()),
      hostname: data.hostname ?? `server-${servers.length + 1}`,
      ip_address: data.ip_address ?? `10.0.0.${servers.length + 10}`,
      ssh_port: data.ssh_port ?? 22,
      ssh_username: data.ssh_username ?? 'root',
      prometheus_url: data.prometheus_url ?? '',
      description: data.description ?? '',
      group_id: data.group_id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    servers.push(newServer);
    this.previewSet('preview_servers', servers);
    return newServer;
  }

  private previewDeleteServer(id: string) {
    const servers = this.previewGet('preview_servers');
    const filtered = servers.filter((s: any) => s.id !== id);
    this.previewSet('preview_servers', filtered);
    return { message: 'Server deleted successfully' };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Preview fallback: mock auth endpoints when backend is unavailable in Lovable preview
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isPreviewHost = host.includes('lovableproject.com') || host.includes('lovable.app');
    if (isPreviewHost) {
      const method = (options.method || 'GET').toString().toUpperCase();
      if (endpoint === '/auth/login') {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
        const email = body.email || 'demo@preview.local';
        const username = (email as string).split('@')[0];
        return {
          user: { id: 'preview-user', email, username, approved: true },
          token: 'preview-token',
          roles: ['admin']
        } as unknown as T;
      }
      if (endpoint === '/auth/signup') {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
        const email = body.email || 'demo@preview.local';
        const username = body.username || (email as string).split('@')[0];
        return {
          user: { id: 'preview-user', email, username, approved: true },
          token: 'preview-token'
        } as unknown as T;
      }
      if (endpoint === '/auth/me') {
        return {
          user: { id: 'preview-user', email: 'demo@preview.local', username: 'demo', approved: true },
          roles: ['admin']
        } as unknown as T;
      }
      if (endpoint === '/auth/logout') {
        return {} as unknown as T;
      }

      // Preview mocks for core resources to avoid HTML responses in preview
      if (endpoint === '/groups' && method === 'GET') {
        return this.previewGetGroups() as unknown as T;
      }
      if (endpoint === '/groups' && method === 'POST') {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
        return this.previewCreateGroup(body) as unknown as T;
      }
      if (endpoint === '/servers' && method === 'GET') {
        return this.previewGetServers() as unknown as T;
      }
      if (endpoint === '/servers' && method === 'POST') {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
        return this.previewCreateServer(body) as unknown as T;
      }
      if (endpoint.startsWith('/servers/') && method === 'DELETE') {
        const id = endpoint.split('/')[2];
        return this.previewDeleteServer(id) as unknown as T;
      }
      if (endpoint === '/ssl-certificates' && method === 'GET') {
        return [] as unknown as T;
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async signUp(email: string, password: string, username?: string) {
    return this.request<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ user: any; token: string; roles: string[] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser() {
    return this.request<{ user: any; roles: string[] }>('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Users
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async getUser(id: string) {
    return this.request<{ user: any; roles: string[] }>(`/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async approveUser(id: string) {
    return this.request(`/users/${id}/approve`, { method: 'POST' });
  }

  async updateUserRoles(id: string, roles: string[]) {
    return this.request(`/users/${id}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roles }),
    });
  }

  // Servers
  async getServers() {
    return this.request<any[]>('/servers');
  }

  async getServer(id: string) {
    return this.request<any>(`/servers/${id}`);
  }

  async createServer(data: any) {
    return this.request('/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServer(id: string, data: any) {
    return this.request(`/servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteServer(id: string) {
    return this.request(`/servers/${id}`, { method: 'DELETE' });
  }

  // Groups
  async getGroups() {
    return this.request<any[]>('/groups');
  }

  async getGroup(id: string) {
    return this.request<any>(`/groups/${id}`);
  }

  async createGroup(data: any) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGroup(id: string, data: any) {
    return this.request(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id: string) {
    return this.request(`/groups/${id}`, { method: 'DELETE' });
  }

  // Permissions
  async getPermissions() {
    return this.request<any[]>('/permissions');
  }

  async createPermission(userId: string, serverId: string) {
    return this.request('/permissions', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_id: serverId }),
    });
  }

  async deletePermission(id: string) {
    return this.request(`/permissions/${id}`, { method: 'DELETE' });
  }

  // SSL Certificates
  async getSSLCertificates() {
    return this.request<any[]>('/ssl-certificates');
  }

  async getSSLCertificate(id: string) {
    return this.request<any>(`/ssl-certificates/${id}`);
  }

  async createSSLCertificate(data: any) {
    return this.request('/ssl-certificates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSSLCertificate(id: string, data: any) {
    return this.request(`/ssl-certificates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSSLCertificate(id: string) {
    return this.request(`/ssl-certificates/${id}`, { method: 'DELETE' });
  }

  // WebSocket URL for SSH
  getSSHWebSocketURL(serverId: string): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = (import.meta.env.VITE_WS_URL as string | undefined) || window.location.host;
    return `${wsProtocol}//${wsHost}/ws/ssh/${serverId}?token=${this.token}`;
  }

  // API Keys (Admin)
  async getAPIKeys() {
    return this.request<any[]>('/api-keys');
  }

  async createAPIKey(name: string, expiresAt?: string) {
    return this.request<{ key: string; key_prefix: string; record: any }>(
      '/api-keys',
      {
        method: 'POST',
        body: JSON.stringify({ name, expires_at: expiresAt ?? null }),
      }
    );
  }

  async setAPIKeyStatus(id: string, active: boolean) {
    return this.request('/api-keys/status', {
      method: 'POST',
      body: JSON.stringify({ id, active }),
    });
  }

  async deleteAPIKey(id: string) {
    return this.request('/api-keys/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }
}

export const apiClient = new APIClient();
