export type Category =
  | 'self-improvement'
  | 'storytelling'
  | 'persuasive'
  | 'gratitude'
  | 'mindfulness'
  | 'creative'
  | 'freeform';

export interface CategoryMeta {
  key: Category;
  label: string;
  description: string;
  icon: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'self-improvement', label: 'Self-Improvement', description: 'Daily reflection and personal growth', icon: '🌱' },
  { key: 'storytelling',     label: 'Storytelling',     description: 'Characters, worlds, and narratives',   icon: '📖' },
  { key: 'persuasive',       label: 'Persuasive Writing', description: 'Arguments, essays, and opinions',   icon: '✍️' },
  { key: 'gratitude',        label: 'Gratitude',         description: 'Appreciating what matters most',      icon: '🙏' },
  { key: 'mindfulness',      label: 'Mindfulness',       description: 'Present-moment awareness',            icon: '💭' },
  { key: 'creative',         label: 'Creative Writing',  description: 'Poetry, prose, and imagination',      icon: '🎨' },
  { key: 'freeform',         label: 'Freeform',          description: 'No prompt. Just write.',              icon: '🌿' },
];

export const FREEFORM_PROMPT = '';

const categoryPrompts: Record<Category, string[]> = {
  'freeform': [FREEFORM_PROMPT],
  'self-improvement': [
    "What habit have you been meaning to build, and what's stopped you so far?",
    "Describe the version of yourself you're working toward.",
    "What's one thing you'd do differently if you started your day over?",
    "Write about a fear that's been holding you back and what it would feel like to move past it.",
    "What does discipline look like in your life right now?",
    "Who do you admire most, and what quality of theirs would you most like to develop?",
    "Write about the last time you stepped outside your comfort zone.",
    "What's one area of your life you've been avoiding honest reflection on?",
    "Describe a goal you've had for a long time but haven't started yet. Why?",
    "What does your ideal morning routine look like, and how close are you to it?",
    "Write about a mistake you made recently and what it taught you.",
    "What boundary do you need to set that you've been putting off?",
    "Describe the person you want to be in five years in specific, honest terms.",
    "What would you do if you weren't afraid of failing?",
    "Write about a time you chose comfort over growth. What would you do differently?",
    "What's one belief about yourself that you're ready to challenge?",
    "Describe a recent win, however small, and what made it possible.",
    "What does your inner critic say most often? How would you respond to it as a friend?",
    "Write about a decision you've been delaying and why.",
    "What does 'becoming a better version of yourself' actually mean to you today?",
  ],

  'storytelling': [
    "Write the opening paragraph of a story that begins with a stranger knocking at the wrong door.",
    "A character wakes up with no memory of the last 24 hours. What do they find in their pockets?",
    "Describe a place through the eyes of someone who is seeing it for the last time.",
    "Write a scene where two old friends meet after ten years and neither says what they really mean.",
    "Your protagonist finds a letter that was never meant to be found. What does it say?",
    "Write a story that starts at the end and works its way backward.",
    "A minor character steps into the spotlight. Tell their side of the story.",
    "Write about a moment of silence between two characters that says everything.",
    "Your character must make a choice with no good options. What do they do?",
    "Describe a setting so vividly that the reader can smell and hear it.",
    "Write the last conversation between two characters before they go separate ways.",
    "A character is trying to hide something. Write the scene where they almost get caught.",
    "Write a story where the twist is that nothing unexpected happens — and that's the point.",
    "Your protagonist does something they're not proud of. Write the moment just after.",
    "Write a scene set entirely in one small room. Make the space feel enormous.",
    "A character receives news that changes everything. Describe only their physical reaction.",
    "Write about two characters who want the same thing but for completely different reasons.",
    "Your character makes a promise they're not sure they can keep. Why do they make it?",
    "Write a story told entirely through what is left unsaid.",
    "Describe a world where one small thing is different. Follow that thread.",
  ],

  'persuasive': [
    "Make the strongest argument you can for a position you disagree with.",
    "Write a case for why the most unpopular opinion you hold is actually correct.",
    "Argue that one widely accepted belief is worth questioning.",
    "Write a persuasive letter to your past self about a decision they're about to make.",
    "Make the case that something considered a weakness is actually a strength.",
    "Write an argument for why the conventional path is overrated.",
    "Persuade a skeptic that one small daily habit can change a life.",
    "Write an op-ed on a local issue you care about.",
    "Make an argument for simplicity in a world that rewards complexity.",
    "Write a rebuttal to an argument you've heard recently that you disagree with.",
    "Argue that failure should be celebrated more than success.",
    "Write a persuasive piece on why slowing down is more productive than speeding up.",
    "Make the case for a book, film, or idea that changed your thinking.",
    "Write an argument for why the most important conversations are the hardest ones.",
    "Persuade someone to take a risk they've been avoiding.",
    "Write a defense of an idea that's been unfairly dismissed.",
    "Make the case that asking better questions matters more than having answers.",
    "Write a persuasive argument for why rest is a form of productivity.",
    "Argue that the way we measure success is fundamentally flawed.",
    "Write a compelling case for kindness as a strategic advantage.",
  ],

  'gratitude': [
    "Write about three things that happened today that you're grateful for, and go deep on one.",
    "Describe a person in your life who makes things easier just by existing.",
    "Write about a difficulty from your past that you're now grateful for.",
    "What's something your body does every day that you've been taking for granted?",
    "Describe a place you love and why it feels like a gift.",
    "Write a thank-you letter to someone who will never see it.",
    "What small, ordinary moment from this week deserves more appreciation?",
    "Write about something you once wanted desperately that you now have.",
    "Who helped you during a hard time, and how did it change things?",
    "Describe a skill or ability you have that you sometimes forget to value.",
    "Write about a relationship in your life that has grown stronger over time.",
    "What is one thing about your daily life that someone else might dream of having?",
    "Write about a time when things didn't go your way — and something good came from it.",
    "Describe the feeling of a meal you truly enjoyed and who made it possible.",
    "Write about something in nature that fills you with quiet gratitude.",
    "What's a piece of advice someone gave you that you didn't appreciate until later?",
    "Write about a moment of unexpected kindness from a stranger.",
    "Describe something you've learned this year that has made your life better.",
    "Write about a creative work — a book, song, or film — that arrived at exactly the right time.",
    "What are you grateful for that's hard to put into words? Try anyway.",
  ],

  'mindfulness': [
    "Describe exactly where you are right now — every detail you can observe.",
    "Write about one sensation you're feeling in your body at this moment.",
    "What is your mind most often thinking about when you're not directing it?",
    "Describe a moment today when you were fully present. What made it possible?",
    "Write about the texture of a routine you do on autopilot.",
    "What emotion are you carrying right now that you haven't named yet?",
    "Write about what it feels like to breathe slowly and intentionally.",
    "Describe the space between a thought arriving and you reacting to it.",
    "What does stillness feel like for you, physically?",
    "Write about a worry you're holding. Set it on a shelf and describe what it looks like.",
    "Describe your inner landscape right now as if it were a weather system.",
    "Write about a recent moment when time seemed to slow down.",
    "What sound, right now, have you been filtering out without realising?",
    "Write about the gap between who you are and who you're pretending to be today.",
    "Describe a repetitive thought you keep returning to and what it might be telling you.",
    "Write about what it would mean to fully accept this moment exactly as it is.",
    "Describe the feeling of finishing something — a task, a conversation, a day.",
    "Write about the difference between observing a feeling and being consumed by it.",
    "What are you resisting right now? What would happen if you stopped?",
    "Describe a moment of genuine peace you experienced recently, however brief.",
  ],

  'creative': [
    "Write a poem about an ordinary object that contains an entire world.",
    "Describe the colour blue without using any colour words.",
    "Write a piece from the perspective of the last hour of a day.",
    "Create a list of rules for a game that can never be won.",
    "Write about a door that leads somewhere impossible.",
    "Describe a sound that has never existed using only metaphor.",
    "Write a love letter from one season to another.",
    "Create a short myth that explains something in everyday life.",
    "Write about memory as a physical place you can walk through.",
    "Describe the moment just before something important happens.",
    "Write a piece where the punctuation tells a different story than the words.",
    "Create a character using only a list of things they've never done.",
    "Write about light — any kind of light — without ever using the word.",
    "Describe a conversation between two objects left alone in a room.",
    "Write a piece that begins and ends with the same sentence, differently understood.",
    "Create a short story using only dialogue — no description at all.",
    "Write about the feeling of almost remembering something.",
    "Describe a city that only exists at night.",
    "Write a piece where the narrator is unreliable in a way they don't realise.",
    "Create something that is half poem, half instruction manual.",
  ],
};

const getDayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};

export const getPromptForCategories = (categories: Category[]): string => {
  const active = categories.length > 0 ? categories : (['self-improvement'] as Category[]);
  // Merge all selected category pools into one combined list
  const pool = active.flatMap((c) => categoryPrompts[c] ?? []);
  return pool[getDayOfYear() % pool.length];
};

export default categoryPrompts;
