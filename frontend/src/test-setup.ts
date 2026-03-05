//Makes Angular decorators work in Vitest/jsdom
import '@angular/compiler';

//URL polyfills
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => 'blob:mock-url',
    writable: true,
    configurable: true,
  });
}
if (typeof URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: () => {},
    writable: true,
    configurable: true,
  });
}

//CSS
Object.defineProperty(window, 'CSS', {
  value: null,
  configurable: true
});

Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'none',
    appearance: [],
    getPropertyValue: () => ''
  }),
  configurable: true
});
