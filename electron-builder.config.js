export default {
  appId: 'com.mayakoba.camaf',
  productName: 'CAMAF',
  npmRebuild: false,
  directories: { output: 'release' },
  files: ['dist-electron/**/*', 'dist/**/*'],
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
