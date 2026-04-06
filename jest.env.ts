// React 19 only ships act() in its development CJS build.
// Override NODE_ENV before any module is loaded so react/index.js
// resolves to react.development.js (which exports act).
process.env.NODE_ENV = 'development';
