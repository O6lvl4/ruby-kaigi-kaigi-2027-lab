// Layering for app/javascript (checked by `npm run lint:architecture`):
//
//   entrypoints → pages → features → (runtime, rails)
//   entrypoints → navigation, rails, runtime
//
// Features never reach up into pages or entrypoints, and stay independent of each other.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'features-stay-below-pages',
      severity: 'error',
      from: { path: '^app/javascript/features/' },
      to: { path: '^app/javascript/(pages|entrypoints|navigation)/' }
    },
    {
      name: 'features-independent',
      comment: 'A feature may not import another feature; share through runtime/ or rails/.',
      severity: 'error',
      from: { path: '^app/javascript/features/([^/]+)/' },
      to: { path: '^app/javascript/features/', pathNot: '^app/javascript/features/$1/' }
    },
    {
      name: 'pages-not-entrypoints',
      severity: 'error',
      from: { path: '^app/javascript/(pages|navigation|rails|runtime)/' },
      to: { path: '^app/javascript/entrypoints/' }
    },
    {
      name: 'infrastructure-is-leaf',
      comment: 'rails/ and runtime/ are infrastructure: no UI layers above them.',
      severity: 'error',
      from: { path: '^app/javascript/(rails|runtime)/' },
      to: { path: '^app/javascript/(pages|features|navigation)/' }
    },
    { name: 'no-orphans', severity: 'warn', from: { orphan: true, pathNot: '(^|/)\\.[^/]+|\\.d\\.ts$|eslint\\.config|vite\\.config' }, to: {} }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^(experiments|dist|node_modules)' },
    moduleSystems: ['es6'],
    tsPreCompilationDeps: false
  }
};
