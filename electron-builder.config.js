export default {
  appId: 'com.mayakoba.camaf.v1',
  productName: 'CAMAF V1',
  npmRebuild: false,
  directories: { output: 'release' },
  files: ['dist-electron/**/*', 'dist/**/*'],
  extraResources: [
    { from: 'electron/db/seed/camaf.db', to: 'db/camaf.db' },
    { from: 'src/assets/brand/logopdfmayakoba.png', to: 'brand/logopdfmayakoba.png' }
  ],
  win: {
    target: 'nsis',
    icon: 'resources/icon.ico',
    signAndEditExecutable: false,
    signtoolOptions: { sign: null }
  },
  mac: { target: 'dmg', icon: 'resources/icon.icns' },
  linux: { target: 'AppImage' },
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true }
};
