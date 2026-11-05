/**
 * The small HTML card shown in a normal browser window: status, "Enter VR" and "Back to lobby".
 * It hides itself while you are inside VR.
 */
export function setupOverlay(app) {
  const hud = document.getElementById('hud');
  const status = document.getElementById('status');
  const enterBtn = document.getElementById('enter-vr');
  const lobbyBtn = document.getElementById('to-lobby');
  const sessionInit = { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] };
  let session = null;

  async function enterVR() {
    if (session) return;
    try {
      session = await navigator.xr.requestSession('immersive-vr', sessionInit);
      session.addEventListener('end', () => { session = null; });
      await app.renderer.xr.setSession(session);
    } catch (err) {
      session = null;
      status.textContent = `Could not start VR (${err.message}). Press Enter VR to try again.`;
    }
  }

  if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
      if (!ok) {
        status.textContent = 'Desktop preview. Open this page on a Quest 3 to enter VR.';
        return;
      }
      enterBtn.hidden = false;
      status.textContent = 'VR headset ready.';
      // Installed as an app on the Quest: go straight into VR.
      if (window.matchMedia('(display-mode: standalone)').matches) enterVR();
    }).catch(() => {
      status.textContent = 'Desktop preview. VR is not available here.';
    });
    // The Quest hands the page a ready VR session when it is launched as an immersive app.
    navigator.xr.addEventListener?.('sessiongranted', enterVR);
  } else {
    status.textContent = window.isSecureContext
      ? 'Desktop preview. This browser has no WebXR.'
      : 'Desktop preview. VR needs https:// or localhost.';
  }

  enterBtn.addEventListener('click', () => { app.sfx.unlock(); enterVR(); });
  lobbyBtn.addEventListener('click', () => app.goTo('lobby'));

  app.on((type, value) => {
    if (type === 'scene') lobbyBtn.hidden = value === 'lobby';
    if (type === 'xr') hud.hidden = value;
  });
}
