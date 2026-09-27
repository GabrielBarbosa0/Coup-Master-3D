import { DEFAULT_MUSIC_VOLUME, DEFAULT_VFX_VOLUME } from './config.js';
import {
  bgmAudio,
  musicBtn,
  resetVfxAudio,
  vfxVolumeSlider,
  volumeSlider
} from './dom.js';

const audioState = {
  musicStarted: false,
  musicMuted: false,
  resumeMusicWhenVisible: false,
  vfxVolume: DEFAULT_VFX_VOLUME,
  lastResetVfxAt: 0,
  vfx: new Map(),
  canReset: () => false,
  onReset: null
};

// Liga a trilha de fundo ao primeiro gesto do jogador e aos controles de volume.
export function setupAudioControls(options = {}) {
  audioState.canReset = typeof options.canReset === 'function' ? options.canReset : audioState.canReset;
  audioState.onReset = typeof options.onReset === 'function' ? options.onReset : audioState.onReset;

  if (!bgmAudio) return;

  if (volumeSlider) volumeSlider.value = String(DEFAULT_MUSIC_VOLUME);
  if (vfxVolumeSlider) vfxVolumeSlider.value = String(DEFAULT_VFX_VOLUME);
  bgmAudio.volume = DEFAULT_MUSIC_VOLUME;
  bgmAudio.muted = audioState.musicMuted;
  audioState.vfxVolume = DEFAULT_VFX_VOLUME;
  preloadVfxAudio();
  setupBackgroundMediaSession();
  syncMusicButton();

  musicBtn?.addEventListener('click', () => {
    audioState.musicMuted = !audioState.musicMuted;
    bgmAudio.muted = audioState.musicMuted;
    if (audioState.musicMuted) {
      pauseBackgroundMusic(false);
    } else {
      startBackgroundMusic();
    }
    syncMusicButton();
  });

  volumeSlider?.addEventListener('input', () => {
    bgmAudio.volume = clampAudioVolume(volumeSlider.value, DEFAULT_MUSIC_VOLUME);
    if (bgmAudio.volume > 0 && audioState.musicMuted) {
      audioState.musicMuted = false;
      bgmAudio.muted = false;
      startBackgroundMusic();
      syncMusicButton();
    }
  });

  vfxVolumeSlider?.addEventListener('input', () => {
    audioState.vfxVolume = clampAudioVolume(vfxVolumeSlider.value, DEFAULT_VFX_VOLUME);
  });

  window.addEventListener('pointerdown', startBackgroundMusic, { once: true });
  window.addEventListener('keydown', startBackgroundMusic, { once: true });
  document.addEventListener('visibilitychange', handleMusicVisibilityChange);
  window.addEventListener('pagehide', () => pauseBackgroundMusic(false));
}

// Toca um efeito sonoro respeitando o volume global de VFX.
export function playVfx(name) {
  const audio = getVfxAudio(name);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = audioState.vfxVolume;
  audio.play().catch(() => {});
}

// Toca o feedback do reset dentro do clique e reinicia a mesa logo depois.
export function triggerResetFromButton(event) {
  event?.stopPropagation();
  if (!audioState.canReset()) return;
  playResetSoundOnce();
  if (audioState.onReset) window.setTimeout(audioState.onReset, 90);
}

// Dispara o som no primeiro evento do clique para garantir ativacao de audio.
export function playResetSoundFromButton(event) {
  event?.stopPropagation();
  if (!audioState.canReset()) return;
  playResetSoundOnce();
}

// Tenta iniciar a música respeitando o bloqueio de autoplay dos navegadores.
function startBackgroundMusic() {
  if (!bgmAudio || audioState.musicMuted || document.hidden || !bgmAudio.paused) return;
  bgmAudio.volume = clampAudioVolume(volumeSlider?.value, DEFAULT_MUSIC_VOLUME);
  bgmAudio.play()
    .then(() => {
      audioState.musicStarted = true;
      setMediaSessionPlaybackState('playing');
    })
    .catch(() => {});
}

// Pausa a trilha quando o jogo deixa de estar visivel.
function handleMusicVisibilityChange() {
  if (document.hidden) {
    pauseBackgroundMusic(true);
    return;
  }

  if (!audioState.resumeMusicWhenVisible || audioState.musicMuted) return;
  audioState.resumeMusicWhenVisible = false;
  startBackgroundMusic();
}

// Pausa o BGM e registra se ele deve voltar quando a pagina ficar visivel.
function pauseBackgroundMusic(resumeWhenVisible) {
  if (!bgmAudio) return;
  audioState.resumeMusicWhenVisible = Boolean(
    resumeWhenVisible
    && !audioState.musicMuted
    && !bgmAudio.paused
  );
  bgmAudio.pause();
  setMediaSessionPlaybackState('none');
}

// Restringe controles externos de faixa e impede retomada com o jogo oculto.
function setupBackgroundMediaSession() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = null;
  const ignoredActions = [
    'pause',
    'stop',
    'seekbackward',
    'seekforward',
    'seekto',
    'previoustrack',
    'nexttrack'
  ];

  ignoredActions.forEach((action) => {
    try {
      navigator.mediaSession.setActionHandler(action, () => {});
    } catch {}
  });

  try {
    navigator.mediaSession.setActionHandler('play', () => {
      if (!document.hidden && !audioState.musicMuted) startBackgroundMusic();
    });
  } catch {}
}

// Atualiza o estado exposto ao sistema operacional quando suportado.
function setMediaSessionPlaybackState(playbackState) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = playbackState;
  } catch {}
}

// Evita repetir o efeito quando pointerdown e click chegam juntos.
function playResetSoundOnce() {
  const now = performance.now();
  if (now - audioState.lastResetVfxAt < 250) return;
  audioState.lastResetVfxAt = now;
  playVfx('reset-game');
}

// Prepara efeitos usados pela interface para evitar atraso no primeiro clique.
function preloadVfxAudio() {
  if (resetVfxAudio) {
    resetVfxAudio.volume = audioState.vfxVolume;
    audioState.vfx.set('reset-game', resetVfxAudio);
  }
  getVfxAudio('card-whoosh');
  getVfxAudio('falling-coin');
}

// Cria e reaproveita instâncias de áudio dos efeitos sonoros.
function getVfxAudio(name) {
  if (audioState.vfx.has(name)) return audioState.vfx.get(name);

  const audio = new Audio(`assets/sounds/vfx/${name}.mp3`);
  audio.preload = 'auto';
  audio.volume = audioState.vfxVolume;
  audioState.vfx.set(name, audio);
  return audio;
}

// Normaliza controles de áudio para o intervalo aceito pelo navegador.
function clampAudioVolume(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 1);
}

// Atualiza o estado visual e acessível do botão de música.
function syncMusicButton() {
  if (!musicBtn) return;
  musicBtn.classList.toggle('is-muted', audioState.musicMuted);
  musicBtn.setAttribute('aria-pressed', String(audioState.musicMuted));
  musicBtn.setAttribute('aria-label', audioState.musicMuted ? 'Ativar música' : 'Mutar música');
  musicBtn.title = audioState.musicMuted ? 'Ativar música' : 'Mutar música';
}
