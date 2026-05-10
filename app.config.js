// app.config.js — Expo dynamic config
//
// Carrega o app.json estático e aplica overrides baseados em APP_VARIANT.
// Variantes:
//   - development → CronoPet Dev (bundle id .dev, ícone diferenciado)
//   - preview     → CronoPet Stg (bundle id .stg)
//   - production  → CronoPet (bundle id padrão)
//
// Setado via package.json scripts (`start:dev`, `start:prod`) ou via EAS Build profiles.

const variant = process.env.APP_VARIANT ?? 'production';

const VARIANTS = {
  development: {
    name: 'CronoPet Dev',
    bundleIdSuffix: '.dev',
    scheme: 'cronopet-dev',
  },
  preview: {
    name: 'CronoPet Stg',
    bundleIdSuffix: '.stg',
    scheme: 'cronopet-stg',
  },
  production: {
    name: 'CronoPet',
    bundleIdSuffix: '',
    scheme: 'cronopet',
  },
};

const cfg = VARIANTS[variant] ?? VARIANTS.production;

module.exports = ({ config }) => ({
  ...config,
  name: cfg.name,
  scheme: cfg.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: `com.cronopet.app${cfg.bundleIdSuffix}`,
  },
  android: {
    ...config.android,
    package: `com.cronopet.app${cfg.bundleIdSuffix.replace(/\./g, '_')}`,
  },
  extra: {
    ...config.extra,
    appVariant: variant,
    eas: { projectId: process.env.EAS_PROJECT_ID ?? config.extra?.eas?.projectId },
  },
});
