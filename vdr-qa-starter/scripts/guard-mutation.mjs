import { requireDisposableTarget } from './target-safety.mjs';
try {
  requireDisposableTarget(process.env);
  console.log('Mutation target accepted: disposable environment explicitly enabled.');
} catch (err) {
  console.error(`Mutation tests blocked: ${err.message}`);
  process.exitCode = 2;
}
