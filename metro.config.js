const { getDefaultConfig } = require('expo/metro-config');

// R7-B: NativeWind removido (sem callsites reais). Voltamos pro
// metro config default — sem withNativeWind wrap, sem global.css.
const config = getDefaultConfig(__dirname);

module.exports = config;
