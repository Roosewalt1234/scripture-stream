// React 19 only ships act() in its development CJS build.
// Override NODE_ENV before any module is loaded so react/index.js
// resolves to react.development.js (which exports act).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(process.env as any).NODE_ENV = 'development';
