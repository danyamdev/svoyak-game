import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { participantsSchema } from '../../domain/game'
import {
  type GameMode,
  type ParticipantDraft,
  type PersistedGameState,
  restorePersistedGameState,
} from './persisted-state'

const STORAGE_KEY = 'svoyak-game-state'
const MAX_PARTICIPANTS = 5
const MAX_TEAM_MEMBERS = 5

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function createParticipant(mode: GameMode, index: number): ParticipantDraft {
  if (mode === 'team') {
    return {
      type: 'team',
      id: createId('team'),
      name: `Команда ${index + 1}`,
      members: [{ id: createId('member'), name: `Участник 1` }],
    }
  }

  return {
    type: 'individual',
    id: createId('player'),
    name: `Игрок ${index + 1}`,
  }
}

function createInitialState(mode: GameMode = 'individual'): PersistedGameState {
  return {
    schemaVersion: 1,
    mode,
    participants: [createParticipant(mode, 0), createParticipant(mode, 1)],
    scores: {},
    status: 'draft',
    roundIndex: 0,
    phase: 'setup',
  }
}

interface StartSessionResult {
  success: boolean
  message?: string
}

interface GameSessionActions {
  setMode: (mode: GameMode) => void
  addParticipant: () => void
  removeParticipant: (participantId: string) => void
  renameParticipant: (participantId: string, name: string) => void
  addTeamMember: (teamId: string) => void
  removeTeamMember: (teamId: string, memberId: string) => void
  renameTeamMember: (teamId: string, memberId: string, name: string) => void
  startSession: () => StartSessionResult
  changeScore: (participantId: string, delta: number) => void
  setRoundIndex: (roundIndex: number) => void
  resetSession: () => void
}

export type GameSessionStore = PersistedGameState & GameSessionActions

const initialState = createInitialState()

export const useGameSessionStore = create<GameSessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setMode: (mode) => set(createInitialState(mode)),
      addParticipant: () => {
        const { mode, participants } = get()
        if (participants.length >= MAX_PARTICIPANTS) return

        set({ participants: [...participants, createParticipant(mode, participants.length)] })
      },
      removeParticipant: (participantId) => {
        const { participants } = get()
        if (participants.length <= 2) return

        set({ participants: participants.filter(({ id }) => id !== participantId) })
      },
      renameParticipant: (participantId, name) =>
        set(({ participants }) => ({
          participants: participants.map((participant) =>
            participant.id === participantId ? { ...participant, name } : participant,
          ),
        })),
      addTeamMember: (teamId) =>
        set(({ participants }) => ({
          participants: participants.map((participant) => {
            if (participant.type !== 'team' || participant.id !== teamId) return participant
            if (participant.members.length >= MAX_TEAM_MEMBERS) return participant

            return {
              ...participant,
              members: [
                ...participant.members,
                {
                  id: createId('member'),
                  name: `Участник ${participant.members.length + 1}`,
                },
              ],
            }
          }),
        })),
      removeTeamMember: (teamId, memberId) =>
        set(({ participants }) => ({
          participants: participants.map((participant) => {
            if (participant.type !== 'team' || participant.id !== teamId) return participant
            if (participant.members.length <= 1) return participant

            return {
              ...participant,
              members: participant.members.filter(({ id }) => id !== memberId),
            }
          }),
        })),
      renameTeamMember: (teamId, memberId, name) =>
        set(({ participants }) => ({
          participants: participants.map((participant) => {
            if (participant.type !== 'team' || participant.id !== teamId) return participant

            return {
              ...participant,
              members: participant.members.map((member) =>
                member.id === memberId ? { ...member, name } : member,
              ),
            }
          }),
        })),
      startSession: () => {
        const { participants } = get()
        const result = participantsSchema.safeParse(participants)

        if (!result.success) {
          return {
            success: false,
            message: 'Заполните имена всех игроков, команд и участников',
          }
        }

        set({
          participants: result.data,
          scores: Object.fromEntries(result.data.map(({ id }) => [id, 0])),
          status: 'active',
          phase: 'board',
          roundIndex: 0,
        })

        return { success: true }
      },
      changeScore: (participantId, delta) => {
        if (!Number.isInteger(delta)) return

        set(({ scores }) => ({
          scores: {
            ...scores,
            [participantId]: (scores[participantId] ?? 0) + delta,
          },
        }))
      },
      setRoundIndex: (roundIndex) => {
        if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex > 2) return
        set({ roundIndex })
      },
      resetSession: () => set(createInitialState(get().mode)),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ schemaVersion, mode, participants, scores, status, roundIndex, phase }) => ({
        schemaVersion,
        mode,
        participants,
        scores,
        status,
        roundIndex,
        phase,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...restorePersistedGameState(persistedState, initialState),
      }),
    },
  ),
)
