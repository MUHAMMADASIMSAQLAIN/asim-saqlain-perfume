(() => {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const clamp = (val, min = 0, max = 1) => Math.min(max, Math.max(min, val));

  const video = $('#ritual');
  const hero = $('#hero');
  const header = $('#header');
  const exitEl = $('#exit');
  const cue = $('#cue');
  const scenes = [...document.querySelectorAll('.scene')].map(el => ({
    el,
    s: parseFloat(el.dataset.start),
    e: parseFloat(el.dataset.end),
    on: false
  }));

  let targetProgress = 0;
  let currentProgress = 0;
  let isSeeking = false;
  let videoDuration = 24.466; // Fallback duration matching exact asset length[cite: 11]

  // Video duration discovery
  const initVideo = () => {
    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      videoDuration = video.duration;
    }
  };

  video.addEventListener('loadedmetadata', initVideo);
  video.addEventListener('canplay', initVideo);
  video.addEventListener('loadeddata', initVideo);
  if (video.readyState >= 1) initVideo();

  // Keep video paused to allow direct scrubbing control
  video.pause();

  // Compute scroll ratio (0.0 to 1.0) through the hero section
  const getProgress = () => {
    const range = hero.offsetHeight - window.innerHeight;
    const top = hero.getBoundingClientRect().top;
    return range > 0 ? clamp(-top / range, 0, 1) : 0;
  };

  // Narrative scene cards fade in/out
  const FADE = 0.22;
  function updateScenes(p) {
    for (const sc of scenes) {
      const len = sc.e - sc.s;
      const t = (p - sc.s) / len;
      let opacity = 0;
      if (t > 0 && t < 1) {
        opacity = Math.min(clamp(t / FADE), clamp((1 - t) / FADE));
      }
      const active = opacity > 0;
      if (active !== sc.on) {
        sc.on = active;
        sc.el.classList.toggle('on', active);
      }
      if (active || sc.lastActive) {
        const rise = t < 0.5 ? (1 - clamp(t / FADE)) * 20 : 0;
        sc.el.style.opacity = opacity.toFixed(3);
        sc.el.style.transform = `translateY(${rise.toFixed(2)}px)`;
      }
      sc.lastActive = active;
    }
  }

  // Handle scroll events
  function handleScroll() {
    targetProgress = getProgress();
    header.classList.toggle('scrolled', window.scrollY > 4);
    if (cue) cue.style.opacity = targetProgress > 0.02 ? 0 : 1;
    if (exitEl) exitEl.style.opacity = clamp((targetProgress - 0.96) / 0.04).toFixed(3);
    updateScenes(targetProgress);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });

  // Native seeked handler to prevent video lockups
  video.addEventListener('seeked', () => {
    isSeeking = false;
  });

  // RAF Render Loop for continuous smooth interpolation
  function renderLoop() {
    // Smooth LERP factor (0.12 provides responsive, buttery-smooth tracking)
    currentProgress += (targetProgress - currentProgress) * 0.12;

    if (!isSeeking && videoDuration > 0) {
      const targetTime = currentProgress * videoDuration;
      // Seek only if difference exceeds threshold (prevents thrashing)
      if (Math.abs(video.currentTime - targetTime) > 0.02) {
        isSeeking = true;
        // fastSeek provides instant hardware seeking in supported browsers
        if ('fastSeek' in video) {
          video.fastSeek(targetTime);
        } else {
          video.currentTime = targetTime;
        }
      }
    }

    requestAnimationFrame(renderLoop);
  }

  // Initial call
  handleScroll();
  requestAnimationFrame(renderLoop);

  // Mobile Drawer Navigation
  const burger = $('#burger');
  const drawer = $('#drawer');
  if (burger && drawer) {
    const toggleDrawer = open => {
      drawer.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      drawer.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => toggleDrawer(!drawer.classList.contains('open')));
    drawer.addEventListener('click', e => {
      if (e.target.closest('a')) toggleDrawer(false);
    });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') toggleDrawer(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 767) toggleDrawer(false);
    });
  }

  // 3D Parallax Tilt on Signature Visual
  const tilt = $('#tilt');
  if (tilt && matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) {
    const img = $('img', tilt);
    tilt.addEventListener('pointermove', e => {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
      if (img) img.style.transform = `scale(1.06) translate(${(-x * 14).toFixed(1)}px,${(-y * 10).toFixed(1)}px)`;
    });
    tilt.addEventListener('pointerleave', () => {
      tilt.style.transform = '';
      if (img) img.style.transform = '';
    });
  }
})();