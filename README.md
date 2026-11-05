# FDC VR

A starter VR app for Meta Quest 3, built with **Three.js + WebXR**. It runs in any browser for testing and installs on the Quest as an `.apk`.

| Goal | Where it lives |
| --- | --- |
| Virtual environments (horizons) | `src/horizons/`: **FDC Plaza** and **Sunset Garden**, plus a builder for new ones |
| FDC-themed VR games | `src/games/`: **Brushing Challenge** and **Cavity Defender** |
| Lobby to move between them | `src/scenes/lobby.js` |
| Casting to a TV | Built into the Quest (see [Cast to a TV](#cast-to-a-tv)); no code needed |

## 1. Run it on your Mac (no headset needed)

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome.

Desktop controls:
- drag to look around
- `W` `A` `S` `D` to walk
- click buttons
- click and hold on plaque spots
- click germs
- `L` to return to the lobby

To jump straight to a scene, add `?scene=` to the URL: `?scene=plaza`, `garden`, `brush` or `cavity`.

### Try the real VR mode without a headset

Install Meta's **Immersive Web Emulator** extension for Chrome. Open DevTools and use its WebXR tab. An **Enter VR** button appears on the page, and you can move the emulated headset and controllers, pull triggers and use the thumbsticks.

## 2. Test on the Quest without publishing

Connect the Quest by USB with Developer Mode on, then run:

```bash
npm run dev
npm run quest:connect     # adb reverse tcp:5173 tcp:5173
```

In the Quest Browser, open **http://localhost:5173** and press **Enter VR**. `localhost` counts as a secure address, so WebXR works without HTTPS.

Quest controls:
- left stick: walk
- right stick: snap turn
- trigger: select, or hold to brush
- B / Y: back to the lobby

## 3. Build the .apk

The APK is a small launcher made by Bubblewrap. It opens your hosted site full screen and straight into VR. So the site has to be online first. These steps use free GitHub Pages hosting.

1. **Create a GitHub repo named `<your-username>.github.io`.** It has to be this exact name so the site lives at the root of the domain, which is where the `/.well-known/assetlinks.json` file must be.
2. In that repo, go to **Settings → Pages → Source** and choose **GitHub Actions**.
3. Set up signing and app links, replacing the address with yours:
   ```bash
   npm run apk:setup -- your-username.github.io
   ```
   This creates `android/fdc-vr.keystore` (your signing key), `public/.well-known/assetlinks.json`, the Bubblewrap config and the GitHub Pages workflow (`.github/workflows/deploy.yml`, copied from `scripts/deploy-pages.yml`).
   **Back up `android/fdc-vr.keystore` and `android/signing.json`.** They're kept out of git on purpose, and you need them for every future update.
4. Push the project:
   ```bash
   git init && git add -A && git commit -m "FDC VR"
   git branch -M main
   git remote add origin https://github.com/your-username/your-username.github.io.git
   git push -u origin main
   ```
   Wait for the **Deploy to GitHub Pages** action to finish (Actions tab, about 1 minute). Then check that `https://your-username.github.io/.well-known/assetlinks.json` opens.
5. Build:
   ```bash
   npm run apk:build
   ```
   You get **`fdc-vr.apk`** in the project folder. The first build downloads Gradle and takes a few minutes.
6. Install it on the Quest:
   ```bash
   adb install -r fdc-vr.apk
   ```
   Open it from **App Library → Unknown Sources**.

### Updating the app

Web changes (new scenes, fixes) only need `git push`. The app loads the site, so you don't rebuild the APK.

Rebuild the APK only when the app's name or icon changes. Bump the version when you do:

```bash
npm run apk:build -- --version 2
```

## 4. Cast to a TV

Nothing to code: the Quest mirrors whatever is on screen, including this app.

- **From the headset:** connect the Quest and the TV (Chromecast or Google TV) to the same Wi-Fi with internet. Then press the Meta button → **Camera** → **Cast** → pick the TV.
- **From the phone:** in the Meta Horizon app, tap **Cast**, pick the headset, then pick the TV.
- **Offline backup for events:** run `scrcpy --crop=1832:1920:0:0` on the Mac with the Quest connected by USB, and show the Mac on the TV over HDMI.

Tip: casting shows one eye with a small delay. Keep important UI near the centre of view.

## Project structure

```
src/
  main.js              starts the app, registers every scene
  overlay.js           the HTML card: status, Enter VR, Back to lobby
  core/
    app.js             renderer, player rig, scene switching with fades
    pointers.js        controller lasers + mouse, hover / select / hold
    locomotion.js      thumbstick walk, snap turn, keyboard + mouse look
    ui.js              3D panels and buttons drawn with a 2D canvas
    sky.js, sfx.js     gradient sky, synthesized sound effects
  scenes/lobby.js      the lobby menu (buttons come from the registries)
  horizons/            environments: index.js lists them, build-horizon.js builds them
  games/               games: index.js lists them, game-shell.js = start/result screen + HUD
public/                manifest, icons (and assetlinks.json after apk:setup)
scripts/apk.mjs        apk:setup and apk:build
scripts/deploy-pages.yml  GitHub Pages workflow template (apk:setup installs it)
```

## Add a new horizon

1. Copy `src/horizons/plaza.js` to, say, `src/horizons/beach.js`, and rename the function to `createBeach`.
2. Change the config: `name`, `tagline`, `sky` colours, `light`, `ground`, `fog`. Then add your props in `build(ctx)`. Use the helpers in `props.js` (trees, hills, flowers, clouds, lamps, benches). Use `ctx.onUpdate((dt, t) => …)` for anything animated.
3. Add one line to `src/horizons/index.js`:
   ```js
   { id: 'beach', name: 'FDC Beach', desc: 'Waves and palm trees', create: createBeach },
   ```

The lobby button appears automatically.

## Add a new game

1. Copy `src/games/brush.js` as a starting point.
2. Make anything clickable with `app.addTarget(mesh, { onSelect, onHold })`.
3. Use `makeGameShell()` for the start screen, results and HUD.
4. Add one line to `src/games/index.js`.

## Performance tips for Quest 3

- Aim for 72 fps or higher.
- Keep scenes under roughly 100 draw calls. The included scenes use 15 to 105.
- Use `InstancedMesh` for repeated objects. `addTrees` already does.
- Avoid real-time shadows and post-processing in VR.
- Fixed foveated rendering is already on (`renderer.xr.setFoveation(1)`).

## Troubleshooting

- **`apk:build` says assetlinks.json doesn't match:** you re-ran setup with a new key. Push again and wait for the deploy.
- **The app opens with a browser bar, or doesn't enter VR:** the asset links check failed. The site must be at the domain root, and `/.well-known/assetlinks.json` must load.
- **`bubblewrap: command not found`:** run `npm install -g @meta-quest/bubblewrap-cli`, then `nvm use --lts`.
- **No Enter VR button on the Quest:** the page must be on `https://` or `localhost` (see step 2).
