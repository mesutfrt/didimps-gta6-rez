import assert from 'node:assert/strict';

// Test database schema export check
import { bookings, slots, notes } from '../db/schema.ts';

assert.ok(bookings, 'bookings table defined');
assert.ok(slots, 'slots table defined');
assert.ok(notes, 'notes table defined');

console.log('PASS: schema defines bookings, slots, and notes.');
