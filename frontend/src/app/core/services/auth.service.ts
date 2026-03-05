import { Injectable, signal } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Router }             from '@angular/router';
import { tap }                from 'rxjs/operators';
import { User, AuthResponse } from '../models/models';
import { environment }        from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  user       = signal<User | null>(null);
  isLoggedIn = signal(false);

  private readonly baseUrl = environment.apiUrl + '/auth';

  constructor(private http: HttpClient, private router: Router) {
    if (localStorage.getItem('token')) {
      this.isLoggedIn.set(true);
      this.loadCurrentUser();
    }
  }

  register(data: { name: string; email: string; password: string }) {
    return this.http
      .post<AuthResponse>(this.baseUrl + '/register', data)
      .pipe(tap(response => this.saveSession(response)));
  }

  login(data: { email: string; password: string }) {
    return this.http
      .post<AuthResponse>(this.baseUrl + '/login', data)
      .pipe(tap(response => this.saveSession(response)));
  }

  logout(): void {
    localStorage.removeItem('token');
    this.user.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
    this.user.set(response.user);
    this.isLoggedIn.set(true);
    this.router.navigate(['/dashboard']);
  }

  private loadCurrentUser(): void {
    this.http.get<User>(this.baseUrl + '/me').subscribe({
      next:  (user) => this.user.set(user),
      error: ()     => this.logout(),
    });
  }
}