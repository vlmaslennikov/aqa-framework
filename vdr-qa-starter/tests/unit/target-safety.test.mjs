import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { requireDisposableTarget } from '../../scripts/target-safety.mjs';

const env = (overrides = {}) => ({RUN_MUTATION_TESTS:'1', QA_ENV_DISPOSABLE:'1',API_BASE_URL:'http://127.0.0.1:3000',...overrides});
test('blocked by default', () => assert.throws(() => requireDisposableTarget(env({RUN_MUTATION_TESTS:'0'}))));
test('blocked against the public API despite explicit flags', () => assert.throws(() => requireDisposableTarget(env({API_BASE_URL:'https://virtual-data-room-production.up.railway.app'}))));
test('requires additional opt-in for remote target', () => assert.throws(() => requireDisposableTarget(env({API_BASE_URL:'https://qa.example.test'}))));
test('local isolated target accepted with both flags', () => assert.equal(requireDisposableTarget(env()), 'http://127.0.0.1:3000/'));
