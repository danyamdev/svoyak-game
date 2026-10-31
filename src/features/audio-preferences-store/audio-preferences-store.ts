import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AudioPreferencesStore {
  musicEnabled: boolean
  musicVolume: number
  setMusicEnabled: (enabled: boolean) => void
  setMusicVolume: (volume: number) => void
}

export const useAudioPreferencesStore = create<AudioPreferencesStore>()(
  persist(
    (set) => ({
      musicEnabled: false,
      musicVolume: 0.22,
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setMusicVolume: (musicVolume) => {
        if (!Number.isFinite(musicVolume) || musicVolume < 0 || musicVolume > 1) return
        set({ musicVolume })
      },
    }),
    {
      name: 'svoyak-audio-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ musicEnabled, musicVolume }) => ({ musicEnabled, musicVolume }),
    },
  ),
)
