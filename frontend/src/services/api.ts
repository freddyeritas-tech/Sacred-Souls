import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

class ApiService {
  private token: string | null = null;

  async init() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('auth_token', token);
    } else {
      await AsyncStorage.removeItem('auth_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}/api${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string, nickname: string, name?: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nickname, name }),
    });
    await this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await this.setToken(data.token);
    return data;
  }

  async processGoogleSession(sessionId: string) {
    const data = await this.request('/auth/google-session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
    await this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    await this.setToken(null);
  }

  // Questionnaire
  async getInterests() {
    return this.request('/questionnaire/interests');
  }

  async submitQuestionnaire(data: {
    spiritual_interests: string[];
    experience_level: string;
    looking_for: string[];
  }) {
    return this.request('/questionnaire/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Subscription
  async getSubscriptionStatus() {
    return this.request('/subscription/status');
  }

  async upgradeSubscription() {
    return this.request('/subscription/upgrade', { method: 'POST' });
  }

  async cancelSubscription() {
    return this.request('/subscription/cancel', { method: 'POST' });
  }

  // Circles
  async getCircles() {
    return this.request('/circles');
  }

  async getMyCircles() {
    return this.request('/circles/my');
  }

  async getCircle(circleId: string) {
    return this.request(`/circles/${circleId}`);
  }

  async createCircle(data: {
    name: string;
    description: string;
    is_public?: boolean;
    spiritual_focus?: string[];
  }) {
    return this.request('/circles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async joinCircle(circleId: string) {
    return this.request(`/circles/${circleId}/join`, { method: 'POST' });
  }

  async leaveCircle(circleId: string) {
    return this.request(`/circles/${circleId}/leave`, { method: 'POST' });
  }

  // Posts
  async getPosts(circleId?: string) {
    const query = circleId ? `?circle_id=${circleId}` : '';
    return this.request(`/posts${query}`);
  }

  async createPost(content: string, circleId?: string) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, circle_id: circleId }),
    });
  }

  async likePost(postId: string) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  }

  // Meetups
  async getMeetups(circleId?: string) {
    const query = circleId ? `?circle_id=${circleId}` : '';
    return this.request(`/meetups${query}`);
  }

  async createMeetup(data: {
    circle_id: string;
    title: string;
    description: string;
    location: string;
    date: string;
  }) {
    return this.request('/meetups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async attendMeetup(meetupId: string) {
    return this.request(`/meetups/${meetupId}/attend`, { method: 'POST' });
  }

  // Users
  async getUserProfile(userId: string) {
    return this.request(`/users/${userId}`);
  }

  async updateProfile(data: {
    nickname?: string;
    name?: string;
    spiritual_interests?: string[];
  }) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
