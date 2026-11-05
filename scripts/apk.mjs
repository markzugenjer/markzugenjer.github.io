#!/usr/bin/env node
/**
 * Package FDC VR as a Meta Quest app (.apk) with Bubblewrap.
 *
 *   npm run apk:setup -- <your-site-host>   once: signing key, assetlinks.json, Bubblewrap config
 *   npm run apk:build                       every time you want a new .apk
 *   npm run apk:build -- --version 2        bump the app version (needed to update an installed app)
 *
 * The .apk is a small launcher that opens your hosted site full screen and straight into VR.
 * Your site must be live on https://<host>/ with /.well-known/assetlinks.json before you build.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = path.join(ROOT, 'android');
const CONFIG = path.join(ROOT, 'apk.config.json');
const SECRETS = path.join(ANDROID, 'signing.json');
const KEYSTORE = path.join(ANDROID, 'fdc-vr.keystore');
const ASSETLINKS = path.join(ROOT, 'public', '.well-known', 'assetlinks.json');
const OUTPUT = path.join(ROOT, 'fdc-vr.apk');

const APP = {
  packageId: 'id.co.fdc.vrgames',
  name: 'FDC VR',
  launcherName: 'FDC VR',
  themeColor: '#6f8a3c',
  backgroundColor: '#eef3e6',
};

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};
const step = (msg) => console.log(`\n▸ ${msg}`);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
};

/** keytool from the JDK that Bubblewrap installed (~/.bubblewrap/config.json), else from PATH. */
function keytool() {
  try {
    const { jdkPath } = readJson(path.join(os.homedir(), '.bubblewrap', 'config.json'));
    const exe = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
    for (const p of [path.join(jdkPath, 'bin', exe), path.join(jdkPath, 'Contents', 'Home', 'bin', exe)]) {
      if (fs.existsSync(p)) return p;
    }
  } catch {
    /* fall through */
  }
  return 'keytool';
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (r.error) fail(`Could not run ${cmd}: ${r.error.message}`);
  if (r.status !== 0) fail(`${cmd} ${args[0] ?? ''} stopped with exit code ${r.status}.`);
}

function fingerprint(secrets) {
  const out = execFileSync(keytool(), [
    '-list', '-v', '-keystore', KEYSTORE, '-alias', secrets.alias, '-storepass', secrets.storePassword,
  ], { encoding: 'utf8' });
  const match = out.match(/SHA256:\s*([0-9A-F]{2}(?::[0-9A-F]{2}){31})/i);
  if (!match) fail('Could not read the SHA-256 fingerprint from the signing key.');
  return match[1].toUpperCase();
}

function twaManifest(host, version) {
  const origin = `https://${host}`;
  return {
    packageId: APP.packageId,
    host,
    name: APP.name,
    launcherName: APP.launcherName,
    display: 'standalone',
    themeColor: APP.themeColor,
    themeColorDark: '#000000',
    navigationColor: '#000000',
    navigationColorDark: '#000000',
    navigationDividerColor: '#00000000',
    navigationDividerColorDark: '#00000000',
    backgroundColor: APP.backgroundColor,
    enableNotifications: false,
    startUrl: '/',
    iconUrl: `${origin}/icons/icon-512.png`,
    maskableIconUrl: `${origin}/icons/icon-maskable-512.png`,
    splashScreenFadeOutDuration: 300,
    signingKey: { path: KEYSTORE, alias: 'fdcvr' },
    appVersionName: String(version),
    appVersionCode: version,
    appVersion: String(version),
    shortcuts: [],
    generatorApp: 'bubblewrap-cli',
    webManifestUrl: `${origin}/manifest.webmanifest`,
    fallbackType: 'customtabs',
    features: {},
    alphaDependencies: { enabled: false },
    enableSiteSettingsShortcut: false,
    isChromeOSOnly: false,
    isMetaQuest: true,
    horizonOSAppMode: 'immersive', // launch straight into VR, no browser window
    fullScopeUrl: `${origin}/`,
    orientation: 'default',
    fingerprints: [],
    additionalTrustedOrigins: [],
    retainedBundles: [],
  };
}

function setup(rawHost) {
  if (!rawHost) fail('Add your site address, for example:  npm run apk:setup -- yourname.github.io');
  const host = rawHost.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  fs.mkdirSync(ANDROID, { recursive: true });

  step('Signing key');
  let secrets;
  if (fs.existsSync(SECRETS) && fs.existsSync(KEYSTORE)) {
    secrets = readJson(SECRETS);
    console.log('  Using the existing key in android/fdc-vr.keystore');
  } else {
    const password = crypto.randomBytes(18).toString('base64url');
    secrets = { alias: 'fdcvr', storePassword: password, keyPassword: password };
    run(keytool(), [
      '-genkeypair', '-keystore', KEYSTORE, '-alias', secrets.alias, '-keyalg', 'RSA', '-keysize', '2048',
      '-validity', '10000', '-storepass', secrets.storePassword, '-keypass', secrets.keyPassword,
      '-dname', 'CN=FDC VR, O=FDC Dental Clinic, C=ID',
    ]);
    writeJson(SECRETS, secrets);
    console.log('  Created android/fdc-vr.keystore and android/signing.json');
    console.log('  Back up both files somewhere safe. Without them you cannot update the app later.');
  }

  step('Digital Asset Links');
  const fp = fingerprint(secrets);
  writeJson(ASSETLINKS, [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: APP.packageId, sha256_cert_fingerprints: [fp] },
  }]);
  console.log(`  Wrote public/.well-known/assetlinks.json (fingerprint ${fp.slice(0, 11)}…)`);

  step('GitHub Pages workflow');
  const workflow = path.join(ROOT, '.github', 'workflows', 'deploy.yml');
  if (!fs.existsSync(workflow)) {
    fs.mkdirSync(path.dirname(workflow), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'deploy-pages.yml'), workflow);
    console.log('  Created .github/workflows/deploy.yml');
  } else {
    console.log('  .github/workflows/deploy.yml already exists');
  }

  step('Bubblewrap config');
  writeJson(CONFIG, { host, packageId: APP.packageId, version: 1 });
  writeJson(path.join(ANDROID, 'twa-manifest.json'), twaManifest(host, 1));
  console.log(`  App will open https://${host}/`);

  console.log(`
✔ Setup done. Next:
  1. Commit and push (git add -A && git commit -m "APK setup" && git push).
  2. Wait for the GitHub Pages deploy, then check https://${host}/.well-known/assetlinks.json opens.
  3. Run: npm run apk:build
`);
}

async function check(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function build(argv) {
  if (!fs.existsSync(CONFIG) || !fs.existsSync(SECRETS)) fail('Run setup first:  npm run apk:setup -- <your-site-host>');
  const cfg = readJson(CONFIG);
  const secrets = readJson(SECRETS);
  const vIndex = argv.indexOf('--version');
  if (vIndex !== -1) {
    const v = Number(argv[vIndex + 1]);
    if (!Number.isInteger(v) || v < 1) fail('--version needs a whole number, for example --version 2');
    cfg.version = v;
    writeJson(CONFIG, cfg);
  }

  step(`Checking https://${cfg.host}/ is live`);
  const manifest = await check(`https://${cfg.host}/manifest.webmanifest`);
  const links = await check(`https://${cfg.host}/.well-known/assetlinks.json`);
  if (!manifest) fail(`https://${cfg.host}/manifest.webmanifest did not load. Push the project and wait for the deploy to finish.`);
  if (!links) fail(`https://${cfg.host}/.well-known/assetlinks.json did not load. Did you push after apk:setup?`);
  if (!links.toUpperCase().includes(fingerprint(secrets))) {
    fail('The assetlinks.json on your site does not match your signing key. Push the latest public/.well-known/assetlinks.json and wait for the deploy.');
  }
  console.log('  Site, manifest and assetlinks.json all OK');

  step('Generating the Android project');
  writeJson(path.join(ANDROID, 'twa-manifest.json'), twaManifest(cfg.host, cfg.version));
  run('bubblewrap', ['update', '--skipVersionUpgrade'], { cwd: ANDROID });

  step('Building and signing the APK (the first build downloads Gradle and takes a few minutes)');
  run('bubblewrap', ['build'], {
    cwd: ANDROID,
    env: { ...process.env, BUBBLEWRAP_KEYSTORE_PASSWORD: secrets.storePassword, BUBBLEWRAP_KEY_PASSWORD: secrets.keyPassword },
  });

  const built = path.join(ANDROID, 'app-release-signed.apk');
  if (!fs.existsSync(built)) fail('Bubblewrap finished but android/app-release-signed.apk is missing.');
  fs.copyFileSync(built, OUTPUT);
  console.log(`
✔ Built fdc-vr.apk (version ${cfg.version})
  Install on the Quest (USB, Developer Mode on):  adb install -r fdc-vr.apk
  Then open it from App Library → Unknown Sources.
`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'setup') setup(rest[0]);
else if (cmd === 'build') await build(rest);
else fail('Use "setup <host>" or "build".');
