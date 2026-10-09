import { expect, it } from 'vitest';
import { apnsShouldRetire, apnsInactiveSince } from '../../supabase/functions/_shared/pushProviderResponse';
it('keeps a token re-registered after Apple marked it inactive', () => {
  expect(apnsShouldRetire({ primary: 'Unregistered', alternate: 'BadDeviceToken', inactiveSince: 1000, registeredAt: 2000 })).toBe(false);
});
it('retires a token both environments reject and that was not re-registered', () => {
  expect(apnsShouldRetire({ primary: 'Unregistered', alternate: 'BadDeviceToken', inactiveSince: 3000, registeredAt: 2000 })).toBe(true);
  expect(apnsShouldRetire({ primary: 'BadDeviceToken', alternate: 'BadDeviceToken', inactiveSince: null, registeredAt: 2000 })).toBe(true);
});
it('never retires on one environment alone or on transient failures', () => {
  expect(apnsShouldRetire({ primary: 'Unregistered', alternate: null, inactiveSince: null, registeredAt: null })).toBe(false);
  expect(apnsShouldRetire({ primary: 'Unregistered', alternate: '', inactiveSince: null, registeredAt: null })).toBe(false);
  expect(apnsShouldRetire({ primary: 'ServiceUnavailable', alternate: 'BadDeviceToken', inactiveSince: null, registeredAt: null })).toBe(false);
});
it('parses only numeric Apple timestamps', () => {
  expect(apnsInactiveSince('{"reason":"Unregistered","timestamp":1791558521000}')).toBe(1791558521000);
  expect(apnsInactiveSince('{"reason":"Unregistered"}')).toBeNull();
  expect(apnsInactiveSince('nope')).toBeNull();
});
