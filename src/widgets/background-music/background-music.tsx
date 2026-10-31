import { useEffect, useRef, useState } from 'react'

import { useAudioPreferencesStore } from '../../features/audio-preferences-store'
import styles from './background-music.module.scss'

const LOOP_SECONDS = 16

function createSoundtrackBuffer(context: AudioContext) {
  const sampleRate = context.sampleRate
  const frameCount = sampleRate * LOOP_SECONDS
  const buffer = context.createBuffer(2, frameCount, sampleRate)
  let noiseSeed = 17

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let frame = 0; frame < frameCount; frame += 1) {
      const time = frame / sampleRate
      const beat = Math.floor(time * 2) % 32
      const beatProgress = (time * 2) % 1
      const melodyFrequencies = [220, 261.63, 233.08, 174.61, 220, 293.66, 261.63, 196]
      const melodyFrequency = melodyFrequencies[Math.floor(beat / 4)]
      const bellEnvelope = Math.exp(-beatProgress * 7) * (beat % 4 === 0 ? 1 : 0)
      const drone =
        Math.sin(Math.PI * 2 * 55 * time) * 0.16 +
        Math.sin(Math.PI * 2 * 82.5 * time + channel * 0.12) * 0.08
      const bell = Math.sin(Math.PI * 2 * melodyFrequency * time) * bellEnvelope * 0.11

      noiseSeed = (noiseSeed * 16_807) % 2_147_483_647
      const noise = (noiseSeed / 2_147_483_647 - 0.5) * 0.012
      data[frame] = (drone + bell + noise) * (0.82 + Math.sin((Math.PI * 2 * time) / 8) * 0.18)
    }
  }

  return buffer
}

export function BackgroundMusic() {
  const { musicEnabled, musicVolume, setMusicEnabled, setMusicVolume } = useAudioPreferencesStore()
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const [isPlaying, setPlaying] = useState(false)

  useEffect(() => {
    if (gainRef.current && contextRef.current) {
      gainRef.current.gain.setTargetAtTime(musicVolume, contextRef.current.currentTime, 0.08)
    }
  }, [musicVolume])

  useEffect(
    () => () => {
      sourceRef.current?.stop()
      void contextRef.current?.close()
    },
    [],
  )

  async function startMusic() {
    const context = contextRef.current ?? new AudioContext()
    contextRef.current = context
    await context.resume()

    const gain = context.createGain()
    gain.gain.setValueAtTime(0, context.currentTime)
    gain.gain.linearRampToValueAtTime(musicVolume, context.currentTime + 0.8)
    gain.connect(context.destination)

    const source = context.createBufferSource()
    source.buffer = createSoundtrackBuffer(context)
    source.loop = true
    source.connect(gain)
    source.start()

    sourceRef.current = source
    gainRef.current = gain
    setMusicEnabled(true)
    setPlaying(true)
  }

  function stopMusic() {
    const context = contextRef.current
    const gain = gainRef.current
    const source = sourceRef.current
    if (context && gain && source) {
      gain.gain.setTargetAtTime(0, context.currentTime, 0.08)
      window.setTimeout(() => source.stop(), 350)
    }
    sourceRef.current = null
    gainRef.current = null
    setMusicEnabled(false)
    setPlaying(false)
  }

  return (
    <aside className={styles.player} aria-label="Фоновая музыка">
      <button
        type="button"
        aria-label={isPlaying ? 'Выключить музыку' : 'Включить музыку'}
        aria-pressed={isPlaying}
        onClick={() => {
          if (isPlaying) stopMusic()
          else void startMusic()
        }}
      >
        {isPlaying ? '🔊' : musicEnabled ? '▶️' : '🔇'}
      </button>
      <label>
        <span>Громкость музыки</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={musicVolume}
          onChange={(event) => setMusicVolume(Number(event.currentTarget.value))}
        />
      </label>
    </aside>
  )
}
