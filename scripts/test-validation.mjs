import assert from 'node:assert/strict';
import { validateBooking, hours } from '../lib/reservations.ts';

// 1. hours must have 24 entries (0 to 23)
assert.equal(hours.length, 24, `Expected 24 hours, got ${hours.length}`);
assert.equal(hours[0], 0, `Expected first hour to be 0, got ${hours[0]}`);
assert.equal(hours[23], 23, `Expected last hour to be 23, got ${hours[23]}`);

// 2. Booking at 02:00 for tomorrow should be valid in 7/24
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const validEarly = validateBooking({
  branch: 1, table: 1, date: tomorrow, hour: 2, duration: 2, name: 'Gece Oyuncusu', phone: '05551112233'
});
assert.equal(validEarly, null, `Expected valid booking at 02:00, got error: ${validEarly}`);

// 3. Booking starting at 23:00 for 2 hours exceeds midnight (25:00) -> should be rejected
const invalidLate = validateBooking({
  branch: 1, table: 1, date: tomorrow, hour: 23, duration: 2, name: 'Gecikmeli', phone: '05551112233'
});
assert.ok(invalidLate !== null && invalidLate.includes('24:00'), `Expected error mentioning 24:00, got: ${invalidLate}`);

console.log('PASS: test-validation passed.');
