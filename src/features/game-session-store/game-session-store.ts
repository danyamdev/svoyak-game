import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { participantsSchema } from '../../domain/game'
import {
  type GameMode,
  type ParticipantDraft,
  type PersistedGameState,
  type RuntimeSnapshot,
  migratePersistedGameState,
  restorePersistedGameState,
} from './persisted-state'

const STORAGE_KEY = 'svoyak-game-state'
const MAX_PARTICIPANTS = 5
const MAX_TEAM_MEMBERS = 5
const MAX_HISTORY_LENGTH = 50

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
    schemaVersion: 2,
    mode,
    participants: [createParticipant(mode, 0), createParticipant(mode, 1)],
    scores: {},
    status: 'draft',
    roundIndex: 0,
    phase: 'setup',
    usedQuestionIds: [],
    activeQuestion: null,
    selectorParticipantId: null,
    history: [],
  }
}

function createRuntimeSnapshot(state: GameSessionStore): RuntimeSnapshot {
  return {
    scores: state.scores,
    roundIndex: state.roundIndex,
    phase: state.phase === 'setup' ? 'board' : state.phase,
    usedQuestionIds: state.usedQuestionIds,
    activeQuestion: state.activeQuestion,
    selectorParticipantId: state.selectorParticipantId,
  }
}

function appendHistory(state: GameSessionStore) {
  // Ограничиваем историю, чтобы длительная партия не раздувала localStorage.
  return [...state.history.slice(-(MAX_HISTORY_LENGTH - 1)), createRuntimeSnapshot(state)]
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
  selectQuestion: (questionId: string, price: number) => void
  chooseAnswerer: (participantId: string) => void
  markCorrect: () => void
  markIncorrect: () => void
  skipQuestion: () => void
  continueAfterAnswer: () => void
  undo: () => void
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
          usedQuestionIds: [],
          activeQuestion: null,
          selectorParticipantId: result.data[0]?.id ?? null,
          history: [],
        })

        return { success: true }
      },
      changeScore: (participantId, delta) => {
        if (!Number.isInteger(delta)) return

        set((state) => ({
          scores: {
            ...state.scores,
            [participantId]: (state.scores[participantId] ?? 0) + delta,
          },
          history: appendHistory(state),
        }))
      },
      setRoundIndex: (roundIndex) => {
        const state = get()
        if (state.phase !== 'board') return
        if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex > 2) return

        set({ roundIndex, history: appendHistory(state) })
      },
      selectQuestion: (questionId, price) => {
        const state = get()
        if (state.phase !== 'board' || state.usedQuestionIds.includes(questionId)) return
        if (!Number.isInteger(price) || price <= 0) return

        set({
          phase: 'question',
          activeQuestion: {
            questionId,
            price,
            eligibleParticipantIds: state.participants.map(({ id }) => id),
            activeParticipantId: null,
            attempts: [],
          },
          history: appendHistory(state),
        })
      },
      chooseAnswerer: (participantId) => {
        const state = get()
        if (state.phase !== 'question' || !state.activeQuestion) return
        if (!state.activeQuestion.eligibleParticipantIds.includes(participantId)) return

        set({
          phase: 'judging',
          activeQuestion: { ...state.activeQuestion, activeParticipantId: participantId },
          history: appendHistory(state),
        })
      },
      markCorrect: () => {
        const state = get()
        const question = state.activeQuestion
        const participantId = question?.activeParticipantId
        if (state.phase !== 'judging' || !question || !participantId) return

        set({
          phase: 'answerReveal',
          scores: {
            ...state.scores,
            [participantId]: (state.scores[participantId] ?? 0) + question.price,
          },
          selectorParticipantId: participantId,
          activeQuestion: {
            ...question,
            attempts: [
              ...question.attempts,
              { participantId, result: 'correct', scoreDelta: question.price },
            ],
          },
          history: appendHistory(state),
        })
      },
      markIncorrect: () => {
        const state = get()
        const question = state.activeQuestion
        const participantId = question?.activeParticipantId
        if (state.phase !== 'judging' || !question || !participantId) return

        const eligibleParticipantIds = question.eligibleParticipantIds.filter(
          (id) => id !== participantId,
        )

        set({
          // Если отвечать больше некому, сразу показываем правильный ответ.
          phase: eligibleParticipantIds.length > 0 ? 'question' : 'answerReveal',
          scores: {
            ...state.scores,
            [participantId]: (state.scores[participantId] ?? 0) - question.price,
          },
          activeQuestion: {
            ...question,
            eligibleParticipantIds,
            activeParticipantId: null,
            attempts: [
              ...question.attempts,
              { participantId, result: 'incorrect', scoreDelta: -question.price },
            ],
          },
          history: appendHistory(state),
        })
      },
      skipQuestion: () => {
        const state = get()
        if (state.phase !== 'question' || !state.activeQuestion) return

        set({ phase: 'answerReveal', history: appendHistory(state) })
      },
      continueAfterAnswer: () => {
        const state = get()
        if (state.phase !== 'answerReveal' || !state.activeQuestion) return

        set({
          phase: 'board',
          usedQuestionIds: [...state.usedQuestionIds, state.activeQuestion.questionId],
          activeQuestion: null,
          history: appendHistory(state),
        })
      },
      undo: () => {
        const state = get()
        const previousState = state.history.at(-1)
        if (!previousState) return

        set({
          ...previousState,
          history: state.history.slice(0, -1),
        })
      },
      resetSession: () => set(createInitialState(get().mode)),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: migratePersistedGameState,
      partialize: ({
        schemaVersion,
        mode,
        participants,
        scores,
        status,
        roundIndex,
        phase,
        usedQuestionIds,
        activeQuestion,
        selectorParticipantId,
        history,
      }) => ({
        schemaVersion,
        mode,
        participants,
        scores,
        status,
        roundIndex,
        phase,
        usedQuestionIds,
        activeQuestion,
        selectorParticipantId,
        history,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...restorePersistedGameState(persistedState, initialState),
      }),
    },
  ),
)
