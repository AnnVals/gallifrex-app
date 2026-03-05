import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token: string | null = localStorage.getItem('token');

  if (token) {
    const authenticatedRequest = request.clone({
      setHeaders: {
        Authorization: 'Bearer ' + token
      }
    });

    return next(authenticatedRequest);
  }

  return next(request);
};