import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  type GameCommand,
  type GameRuntimeState,
  findGameQuestion,
  participantsSchema,
  transitionGame,
} from '../../domain/game'
import { getGameDefinition } from '../game-definition-store'
import {
  type GameMode,
  type ParticipantDraft,
  type PersistedGameState,
  type QuestionTimerState,
  type RuntimeSnapshot,
  migratePersistedGameState,
  restorePersistedGameState,
} from './persisted-state'

const STORAGE_KEY = 'svoyak-game-state'
const MAX_PARTICIPANTS = 5
const MAX_TEAM_MEMBERS = 5
const MAX_HISTORY_LENGTH = 50
const DEFAULT_TIMER_SECONDS = 30

function createInitialTimer(durationSeconds = DEFAULT_TIMER_SECONDS): QuestionTimerState {
  return {
    durationSeconds,
    status: 'idle',
    remainingMs: durationSeconds * 1000,
    endsAt: null,
  }
}

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
    schemaVersion: 5,
    mode,
    participants: [createParticipant(mode, 0), createParticipant(mode, 1)],
    scores: {},
    status: 'draft',
    roundIndex: 0,
    phase: 'setup',
    usedQuestionIds: [],
    activeQuestion: null,
    selectorParticipantId: null,
    finalState: null,
    history: [],
    areScoresVisible: false,
    questionTimer: createInitialTimer(),
  }
}

function toRuntimeState(state: GameSessionStore): GameRuntimeState {
  return {
    scores: state.scores,
    roundIndex: state.roundIndex,
    phase: state.phase === 'setup' ? 'board' : state.phase,
    usedQuestionIds: state.usedQuestionIds,
    activeQuestion: state.activeQuestion,
    selectorParticipantId: state.selectorParticipantId,
    finalState: state.finalState,
  }
}

function createRuntimeSnapshot(state: GameSessionStore): RuntimeSnapshot {
  return toRuntimeState(state)
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
  toggleScoresVisibility: () => void
  setTimerDuration: (seconds: number) => void
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  expireTimer: () => void
  selectQuestion: (questionId: string) => void
  chooseCatRecipient: (participantId: string) => void
  chooseCatPrice: (price: number) => void
  chooseAuctionWinner: (participantId: string) => void
  chooseAuctionBid: (bid: number) => void
  chooseAnswerer: (participantId: string) => void
  revealAnswer: () => void
  selectAnswerOutcome: (result: 'correct' | 'accepted' | 'incorrect', scoreDelta: number) => void
  confirmAnswerOutcome: () => void
  skipQuestion: () => void
  continueAfterAnswer: () => void
  advanceRound: () => void
  startFinal: () => void
  eliminateFinalTheme: (themeId: string) => void
  submitFinalWagers: (wagers: Record<string, number>) => void
  openFinalQuestion: () => void
  revealFinalAnswer: () => void
  judgeFinalParticipant: (participantId: string, result: 'correct' | 'incorrect') => void
  revealTieBreakerAnswer: () => void
  chooseTieBreakerWinner: (participantId: string) => void
  restartSession: () => void
  undo: () => void
  resetGame: () => void
}

export type GameSessionStore = PersistedGameState & GameSessionActions

const initialState = createInitialState()

export const useGameSessionStore = create<GameSessionStore>()(
  persist(
    (set, get) => {
      function dispatch(command: GameCommand) {
        const state = get()
        const runtimeState = toRuntimeState(state)
        const nextRuntimeState = transitionGame(runtimeState, command)

        if (nextRuntimeState === runtimeState) return
        set({ ...nextRuntimeState, history: appendHistory(state) })
      }

      return {
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
            finalState: null,
            history: [],
            areScoresVisible: false,
            questionTimer: createInitialTimer(),
          })

          return { success: true }
        },
        changeScore: (participantId, delta) =>
          dispatch({ type: 'scoreAdjusted', participantId, delta }),
        toggleScoresVisibility: () =>
          set(({ areScoresVisible }) => ({ areScoresVisible: !areScoresVisible })),
        setTimerDuration: (seconds) => {
          if (!Number.isInteger(seconds) || seconds < 5 || seconds > 300) return
          set({ questionTimer: createInitialTimer(seconds) })
        },
        startTimer: () =>
          set(({ questionTimer }) => {
            const remainingMs =
              questionTimer.remainingMs > 0
                ? questionTimer.remainingMs
                : questionTimer.durationSeconds * 1000
            return {
              questionTimer: {
                ...questionTimer,
                status: 'running',
                remainingMs,
                endsAt: Date.now() + remainingMs,
              },
            }
          }),
        pauseTimer: () =>
          set(({ questionTimer }) => {
            if (questionTimer.status !== 'running' || !questionTimer.endsAt) return {}
            return {
              questionTimer: {
                ...questionTimer,
                status: 'paused',
                remainingMs: Math.max(0, questionTimer.endsAt - Date.now()),
                endsAt: null,
              },
            }
          }),
        resetTimer: () =>
          set(({ questionTimer }) => ({
            questionTimer: createInitialTimer(questionTimer.durationSeconds),
          })),
        expireTimer: () =>
          set(({ questionTimer }) => {
            if (
              questionTimer.status !== 'running' ||
              !questionTimer.endsAt ||
              questionTimer.endsAt > Date.now()
            ) {
              return {}
            }

            return {
              questionTimer: {
                ...questionTimer,
                status: 'expired',
                remainingMs: 0,
                endsAt: null,
              },
            }
          }),
        selectQuestion: (questionId) => {
          const definition = getGameDefinition()
          const lookup = findGameQuestion(definition, questionId)
          if (!lookup) return

          const roundPrices = definition.rounds[get().roundIndex].categories.flatMap(
            ({ questions }) => questions.map(({ price }) => price),
          )
          const catPriceOptions: [number, number] = [
            Math.min(...roundPrices),
            Math.max(...roundPrices),
          ]

          dispatch({
            type: 'questionSelected',
            questionId,
            questionType: lookup.question.type,
            price: lookup.question.price,
            catPriceOptions: lookup.question.type === 'cat' ? catPriceOptions : null,
            acceptedAnswerScores: Object.values(lookup.question.acceptedAnswerScores),
            participantIds: get().participants.map(({ id }) => id),
          })
          set(({ questionTimer }) => ({
            questionTimer: createInitialTimer(questionTimer.durationSeconds),
          }))
        },
        chooseCatRecipient: (participantId) =>
          dispatch({ type: 'catRecipientChosen', participantId }),
        chooseCatPrice: (price) => dispatch({ type: 'catPriceChosen', price }),
        chooseAuctionWinner: (participantId) =>
          dispatch({ type: 'auctionWinnerChosen', participantId }),
        chooseAuctionBid: (bid) => dispatch({ type: 'auctionBidChosen', bid }),
        chooseAnswerer: (participantId) => dispatch({ type: 'answererChosen', participantId }),
        revealAnswer: () => {
          dispatch({ type: 'answerRevealed' })
          const { questionTimer } = get()
          if (questionTimer.status === 'running' && questionTimer.endsAt) {
            set({
              questionTimer: {
                ...questionTimer,
                status: 'paused',
                remainingMs: Math.max(0, questionTimer.endsAt - Date.now()),
                endsAt: null,
              },
            })
          }
        },
        selectAnswerOutcome: (result, scoreDelta) =>
          dispatch({ type: 'answerOutcomeSelected', result, scoreDelta }),
        confirmAnswerOutcome: () => dispatch({ type: 'answerOutcomeConfirmed' }),
        skipQuestion: () => dispatch({ type: 'questionSkipped' }),
        continueAfterAnswer: () =>
          dispatch({
            type: 'answerClosed',
            roundQuestionIds: getGameDefinition().rounds[get().roundIndex].categories.flatMap(
              ({ questions }) => questions.map(({ id }) => id),
            ),
          }),
        advanceRound: () =>
          dispatch({
            type: 'nextRoundStarted',
            totalRounds: getGameDefinition().rounds.length,
          }),
        startFinal: () =>
          dispatch({
            type: 'finalStarted',
            themeIds: getGameDefinition().finalThemes.map(({ id }) => id),
            participantIds: get().participants.map(({ id }) => id),
          }),
        eliminateFinalTheme: (themeId) => dispatch({ type: 'finalThemeEliminated', themeId }),
        submitFinalWagers: (wagers) => dispatch({ type: 'finalWagersSubmitted', wagers }),
        openFinalQuestion: () => dispatch({ type: 'finalQuestionOpened' }),
        revealFinalAnswer: () => dispatch({ type: 'finalAnswerRevealed' }),
        judgeFinalParticipant: (participantId, result) =>
          dispatch({ type: 'finalParticipantJudged', participantId, result }),
        revealTieBreakerAnswer: () => dispatch({ type: 'tieBreakerAnswerRevealed' }),
        chooseTieBreakerWinner: (participantId) =>
          dispatch({ type: 'tieBreakerWinnerChosen', participantId }),
        restartSession: () => {
          const { participants } = get()
          set({
            scores: Object.fromEntries(participants.map(({ id }) => [id, 0])),
            status: 'active',
            phase: 'board',
            roundIndex: 0,
            usedQuestionIds: [],
            activeQuestion: null,
            selectorParticipantId: participants[0]?.id ?? null,
            finalState: null,
            history: [],
            areScoresVisible: false,
            questionTimer: createInitialTimer(),
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
        resetGame: () => set(createInitialState()),
      }
    },
    {
      name: STORAGE_KEY,
      version: 5,
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
        finalState,
        history,
        areScoresVisible,
        questionTimer,
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
        finalState,
        history,
        areScoresVisible,
        questionTimer,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...restorePersistedGameState(persistedState, initialState),
      }),
    },
  ),
)
