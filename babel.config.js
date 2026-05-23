module.exports = function (api) {
  api.cache(true);
  return {
    // R7-FIX (build #9 ERRORED): preset nativewind removido após
    // uninstall de nativewind + tailwindcss. Sem isso o Babel não
    // achava o módulo e o bundle iOS quebrava na fase EAGER_BUNDLE.
    // Voltamos pro preset default da Expo.
    presets: ['babel-preset-expo'],
  };
};
