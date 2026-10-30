import { gameDefinitionSchema, type GameDefinition, type Question } from '../model'
import { DEFAULT_GAME_RULES, ROUND_PRICE_SCALES } from '../rules'

const categoryNames = [
  ['Призраки', 'Зелья', 'Проклятия', 'Монстры', 'Тёмные истории'],
  ['Тыквы', 'Киноужасы', 'Ночная природа', 'Суеверия', 'Хэллоуин в мире'],
  ['Мифология', 'Мистическая литература', 'Зловещая наука', 'Страшная музыка', 'Последняя свеча'],
] as const

const sampleQuestions = [
  [
    ['Как называют шумного призрака, который двигает предметы?', 'Полтергейст'],
    ['Как зовут дружелюбного призрака из известной серии фильмов?', 'Каспер'],
    ['Какой дух из ирландских легенд предвещает смерть своим плачем?', 'Банши'],
    ['Как называется вещество, которое связывали с появлением духов?', 'Эктоплазма'],
    ['Кто написал повесть «Кентервильское привидение»?', 'Оскар Уайльд'],
  ],
  [
    ['В каком сосуде ведьмы традиционно варят зелья?', 'В котле'],
    ['Как называют средство против яда?', 'Противоядие'],
    ['Какое мифическое зелье дарует вечную молодость?', 'Эликсир молодости'],
    ['Как называется превращение простых металлов в золото?', 'Трансмутация'],
    ['Какой волшебный корень часто изображают в виде человеческой фигуры?', 'Мандрагора'],
  ],
  [
    ['Как называют защитный предмет от проклятий?', 'Амулет'],
    ['Какое небесное тело традиционно связывают с превращением оборотня?', 'Полная луна'],
    ['Как называется суеверный взгляд, приносящий несчастье?', 'Сглаз'],
    ['Проклятие гробницы какого фараона стало газетной сенсацией XX века?', 'Тутанхамона'],
    ['Как называется магический символ, ограничивающий действие заклинания?', 'Магический круг'],
  ],
  [
    ['Какое существо боится солнечного света и питается кровью?', 'Вампир'],
    ['Кто создал роман о Викторе Франкенштейне?', 'Мэри Шелли'],
    ['Как называют ожившего покойника в гаитянском фольклоре?', 'Зомби'],
    ['Какое чудовище жило в лабиринте на Крите?', 'Минотавр'],
    ['Как называется египетское тело, сохранённое бальзамированием?', 'Мумия'],
  ],
  [
    ['Кто написал роман «Дракула»?', 'Брэм Стокер'],
    ['Какая птица повторяет слово «никогда» в стихотворении Эдгара По?', 'Ворон'],
    ['Кто создал мифы о Ктулху?', 'Говард Лавкрафт'],
    ['Как зовут героя, чей портрет стареет вместо него?', 'Дориан Грей'],
    ['Кто написал «Легенду о Сонной Лощине»?', 'Вашингтон Ирвинг'],
  ],
] as const

const finalThemes = [
  ['Ночь', 'Как называется самая короткая ночь в году?', 'Ночь летнего солнцестояния'],
  ['Литература', 'Кто написал повесть «Вий»?', 'Николай Гоголь'],
  ['Кино', 'Кто снял фильм «Психо» 1960 года?', 'Альфред Хичкок'],
  ['Мифы', 'Как звали перевозчика душ через реку Стикс?', 'Харон'],
  ['Традиции', 'Какой овощ изначально вырезали вместо тыквы?', 'Репу'],
  ['Музыка', 'Кто написал композицию «Пляска смерти»?', 'Камиль Сен-Санс'],
  ['Наука', 'Как называется боязнь темноты?', 'Никтофобия'],
] as const

function createQuestion(
  roundIndex: number,
  categoryIndex: number,
  questionIndex: number,
): Question {
  const [prompt, answer] = sampleQuestions[categoryIndex][questionIndex]
  const id = `round-${roundIndex + 1}-category-${categoryIndex + 1}-question-${questionIndex + 1}`
  const baseQuestion = {
    id,
    price: ROUND_PRICE_SCALES[roundIndex][questionIndex],
    prompt: [
      {
        type: 'text' as const,
        text:
          roundIndex === 0
            ? prompt
            : `${prompt} (демонстрационный вопрос раунда ${roundIndex + 1})`,
      },
    ],
    answer: [{ type: 'text' as const, text: answer }],
    acceptedAnswers: [answer],
  }

  // В стартовом пакете по одному спецвопросу каждого типа; редактор позже изменит распределение.
  if (categoryIndex === roundIndex && questionIndex === 2) {
    return { ...baseQuestion, type: 'cat', priceMode: 'roundMinMax' }
  }

  if (categoryIndex === (roundIndex + 2) % 5 && questionIndex === 3) {
    return { ...baseQuestion, type: 'auction' }
  }

  return { ...baseQuestion, type: 'regular' }
}

export const DEFAULT_GAME_DEFINITION: GameDefinition = gameDefinitionSchema.parse({
  schemaVersion: 1,
  id: 'halloween-party',
  title: 'Своя игра',
  rules: DEFAULT_GAME_RULES,
  rounds: categoryNames.map((categoryTitles, roundIndex) => ({
    id: `round-${roundIndex + 1}`,
    title: `Раунд ${roundIndex + 1}`,
    categories: categoryTitles.map((title, categoryIndex) => ({
      id: `round-${roundIndex + 1}-category-${categoryIndex + 1}`,
      title,
      questions: ROUND_PRICE_SCALES[roundIndex].map((_, questionIndex) =>
        createQuestion(roundIndex, categoryIndex, questionIndex),
      ),
    })),
  })),
  finalThemes: finalThemes.map(([title, prompt, answer], index) => ({
    id: `final-theme-${index + 1}`,
    title,
    prompt: [{ type: 'text', text: prompt }],
    answer: [{ type: 'text', text: answer }],
    acceptedAnswers: [answer],
  })),
  tieBreakers: [
    {
      id: 'tie-breaker-1',
      title: 'Дополнительный вопрос',
      prompt: [{ type: 'text', text: 'В каком месяце отмечают Хэллоуин?' }],
      answer: [{ type: 'text', text: 'В октябре' }],
      acceptedAnswers: ['Октябрь', 'В октябре'],
    },
  ],
})

export interface GameQuestionLookup {
  categoryTitle: string
  question: Question
}

export function findGameQuestion(questionId: string): GameQuestionLookup | undefined {
  for (const round of DEFAULT_GAME_DEFINITION.rounds) {
    for (const category of round.categories) {
      const question = category.questions.find(({ id }) => id === questionId)
      if (question) return { categoryTitle: category.title, question }
    }
  }

  return undefined
}
