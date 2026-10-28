import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const alredyLoggedGuard: CanActivateFn = (route, state) => {
    let router= inject(Router)
  if (localStorage.getItem('socialToken')) {
    return router.parseUrl('/feeds')
  }
  else {
    return true;
  }
};
