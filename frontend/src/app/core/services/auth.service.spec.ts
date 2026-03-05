import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of }         from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router }     from '@angular/router';
import { AuthService } from './auth.service';

const MOCK_USER = {
  id:       1,
  name:     'Ana García',
  email:    'ana@test.com',
  currency: 'EUR',
};

const MOCK_AUTH = {
  token: 'jwt-token-abc',
  user:  MOCK_USER,
};

function makeAuth() {
  const http = {
    post: vi.fn().mockReturnValue(of(MOCK_AUTH)),
    get:  vi.fn().mockReturnValue(of(MOCK_USER)),
  } as unknown as HttpClient;

  const router = { navigate: vi.fn() } as unknown as Router;

  return { svc: new AuthService(http, router), http, router };
}

describe('AuthService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(()  => localStorage.clear());

  it('should be created', () => {
    const { svc } = makeAuth();
    expect(svc).toBeTruthy();
  });

  it('starts as not logged in when no token in localStorage', () => {
    const { svc } = makeAuth();
    expect(svc.isLoggedIn()).toBe(false);
    expect(svc.user()).toBeNull();
  });

  describe('login()', () => {
    it('calls POST /auth/login and saves token', () => {
      const { svc, http } = makeAuth();

      svc.login({ email: 'ana@test.com', password: '123456' }).subscribe(res => {
        expect(res.token).toBe('jwt-token-abc');
      });

      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        { email: 'ana@test.com', password: '123456' },
      );
      expect(localStorage.getItem('token')).toBe('jwt-token-abc');
      expect(svc.isLoggedIn()).toBe(true);
      expect(svc.user()?.name).toBe('Ana García');
    });

    it('navigates to /dashboard after successful login', () => {
      const { svc, router } = makeAuth();
      svc.login({ email: 'ana@test.com', password: '123456' }).subscribe();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('register()', () => {
    it('calls POST /auth/register and saves session', () => {
      const { svc, http } = makeAuth();

      svc.register({ name: 'Ana', email: 'ana@test.com', password: '123456' }).subscribe();

      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/register',
        expect.objectContaining({ email: 'ana@test.com' }),
      );
      expect(svc.isLoggedIn()).toBe(true);
    });
  });

  describe('logout()', () => {
    it('clears token, resets state and navigates to /login', () => {
      const { svc, router } = makeAuth();

      localStorage.setItem('token', 'some-token');
      svc.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(svc.isLoggedIn()).toBe(false);
      expect(svc.user()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});