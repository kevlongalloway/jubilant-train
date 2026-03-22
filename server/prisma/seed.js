/**
 * Database seed — 20 users, 25 books, ~250 posts, interactions, follows.
 * Idempotent: skips if >= 18 users exist, otherwise wipes and re-seeds.
 * Run: node prisma/seed.js  (from server/ directory, requires DATABASE_URL)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const BOOKS = [
  { title: 'Intermezzo',               author: 'Sally Rooney',        genres: ['literary fiction', 'contemporary'],                         metadata: { rating: 4.1, year: 2024, cc: '#8B6A8A' } },
  { title: 'James',                    author: 'Percival Everett',     genres: ['literary fiction', 'historical fiction'],                   metadata: { rating: 4.5, year: 2024, cc: '#6A8B6A' } },
  { title: 'Orbital',                  author: 'Samantha Harvey',      genres: ['literary fiction', 'science fiction'],                      metadata: { rating: 4.2, year: 2023, cc: '#5A7AB4' } },
  { title: 'The Vegetarian',           author: 'Han Kang',             genres: ['literary fiction', 'psychological fiction'],                metadata: { rating: 4.0, year: 2015, cc: '#8A6A5A' } },
  { title: 'Beloved',                  author: 'Toni Morrison',        genres: ['literary fiction', 'historical fiction'],                   metadata: { rating: 4.6, year: 1987, cc: '#6A5A8A' } },
  { title: 'Demon Copperhead',         author: 'Barbara Kingsolver',   genres: ['literary fiction', 'social commentary'],                    metadata: { rating: 4.4, year: 2022, cc: '#8A7A5A' } },
  { title: 'Tomorrow and Tomorrow',    author: 'Gabrielle Zevin',      genres: ['literary fiction', 'contemporary', 'friendship'],           metadata: { rating: 4.4, year: 2022, cc: '#5A6A8A' } },
  { title: 'Trust',                    author: 'Hernan Diaz',          genres: ['literary fiction', 'historical fiction', 'metafiction'],    metadata: { rating: 4.3, year: 2022, cc: '#8A7A6A' } },
  { title: 'Lessons in Chemistry',     author: 'Bonnie Garmus',        genres: ['literary fiction', 'historical fiction', 'humor'],          metadata: { rating: 4.4, year: 2022, cc: '#8A8A5A' } },
  { title: 'The Covenant of Water',    author: 'Abraham Verghese',     genres: ['literary fiction', 'family saga'],                          metadata: { rating: 4.5, year: 2023, cc: '#5A8A8A' } },
  { title: 'Creation Lake',            author: 'Rachel Kushner',       genres: ['literary fiction', 'thriller'],                             metadata: { rating: 3.9, year: 2024, cc: '#5A4A6A' } },
  { title: 'All Fours',                author: 'Miranda July',         genres: ['literary fiction', 'contemporary', 'feminist fiction'],     metadata: { rating: 3.8, year: 2024, cc: '#5A8A7A' } },
  { title: 'The God of the Woods',     author: 'Liz Moore',            genres: ['mystery', 'thriller', 'historical fiction'],                metadata: { rating: 4.3, year: 2024, cc: '#7A8A5A' } },
  { title: 'James Baldwin Essays',     author: 'James Baldwin',        genres: ['literary nonfiction', 'social commentary', 'essays'],       metadata: { rating: 4.8, year: 1963, cc: '#5A5A8A' } },
  { title: 'The Dispossessed',         author: 'Ursula K. Le Guin',    genres: ['science fiction', 'utopian fiction'],                       metadata: { rating: 4.5, year: 1974, cc: '#6A7A5A' } },
  { title: 'Flights',                  author: 'Olga Tokarczuk',       genres: ['literary fiction', 'international', 'philosophical'],       metadata: { rating: 4.1, year: 2017, cc: '#7A6A8A' } },
  { title: 'A Little Life',            author: 'Hanya Yanagihara',     genres: ['literary fiction', 'contemporary', 'trauma'],               metadata: { rating: 4.2, year: 2015, cc: '#8A5A5A' } },
  { title: 'Normal People',            author: 'Sally Rooney',         genres: ['literary fiction', 'contemporary', 'romance'],              metadata: { rating: 4.1, year: 2018, cc: '#5A7A5A' } },
  { title: 'Lincoln in the Bardo',     author: 'George Saunders',      genres: ['literary fiction', 'historical fiction', 'experimental'],   metadata: { rating: 4.0, year: 2017, cc: '#7A5A5A' } },
  { title: 'Piranesi',                 author: 'Susanna Clarke',        genres: ['fantasy', 'mystery', 'literary fiction'],                   metadata: { rating: 4.3, year: 2020, cc: '#5A8A6A' } },
  { title: 'The Secret History',       author: 'Donna Tartt',          genres: ['literary fiction', 'mystery', 'dark academia'],             metadata: { rating: 4.4, year: 1992, cc: '#6A5A7A' } },
  { title: 'Cloud Atlas',              author: 'David Mitchell',        genres: ['literary fiction', 'science fiction', 'experimental'],      metadata: { rating: 4.2, year: 2004, cc: '#5A6A7A' } },
  { title: 'The Remains of the Day',   author: 'Kazuo Ishiguro',       genres: ['literary fiction', 'historical fiction'],                   metadata: { rating: 4.3, year: 1989, cc: '#7A7A5A' } },
  { title: 'Middlemarch',              author: 'George Eliot',         genres: ['literary fiction', 'Victorian', 'classics'],                metadata: { rating: 4.4, year: 1871, cc: '#8A6A7A' } },
  { title: 'Gilead',                   author: 'Marilynne Robinson',   genres: ['literary fiction', 'contemporary', 'spiritual'],            metadata: { rating: 4.3, year: 2004, cc: '#7A8A6A' } },
];

const USERS = [
  { username: 'Maya Chen',      handle: '@mchen',      email: 'maya@precis.app',    lens: 'empath',      bio: 'Reading as an act of feeling.' },
  { username: 'Oliver Walsh',   handle: '@owalsh',     email: 'oliver@precis.app',  lens: 'analyst',     bio: 'Structure is story.' },
  { username: 'Zara Osei',      handle: '@zosei',      email: 'zara@precis.app',    lens: 'philosopher', bio: 'Every sentence is a door.' },
  { username: 'Eli Park',       handle: '@epark',      email: 'eli@precis.app',     lens: 'storyteller', bio: 'What question does this book refuse to answer?' },
  { username: 'Carmen Reyes',   handle: '@creyes',     email: 'carmen@precis.app',  lens: 'explorer',    bio: 'Borders are for crossing.' },
  { username: 'Jin Torres',     handle: '@jtorres',    email: 'jin@precis.app',     lens: 'alchemist',   bio: 'Prose should leave marks.' },
  { username: 'Priya Anand',    handle: '@panand',     email: 'priya@precis.app',   lens: 'empath',      bio: 'Stories as inheritance.' },
  { username: 'Marcus Cole',    handle: '@mcole',      email: 'marcus@precis.app',  lens: 'analyst',     bio: 'Every sentence is load-bearing.' },
  { username: 'Yuki Tanaka',    handle: '@ytanaka',    email: 'yuki@precis.app',    lens: 'explorer',    bio: 'Reading across every border.' },
  { username: 'David Chen',     handle: '@dchen',      email: 'david@precis.app',   lens: 'philosopher', bio: 'The text reads you back.' },
  { username: 'Nina Okafor',    handle: '@nokafor',    email: 'nina@precis.app',    lens: 'alchemist',   bio: 'Language is the house of being.' },
  { username: 'Sofia Lindqvist',handle: '@slindqvist', email: 'sofia@precis.app',   lens: 'storyteller', bio: 'Every story is two stories.' },
  { username: 'Ahmed Hassan',   handle: '@ahassan',    email: 'ahmed@precis.app',   lens: 'philosopher', bio: 'Books are arguments with the dead.' },
  { username: 'Lena Weber',     handle: '@lweber',     email: 'lena@precis.app',    lens: 'empath',      bio: 'Reading for what it changes in you.' },
  { username: 'Kai Nakamura',   handle: '@knakamura',  email: 'kai@precis.app',     lens: 'analyst',     bio: 'Form is content.' },
  { username: 'Amara Diallo',   handle: '@adiallo',    email: 'amara@precis.app',   lens: 'storyteller', bio: 'The story always outlives the teller.' },
  { username: 'Felix Brennan',  handle: '@fbrennan',   email: 'felix@precis.app',   lens: 'explorer',    bio: 'Books as maps of elsewhere.' },
  { username: 'Rena Marsh',     handle: '@rmarsh',     email: 'rena@precis.app',    lens: 'alchemist',   bio: 'Writing is always about something else.' },
  { username: 'Tobias Grant',   handle: '@tgrant',     email: 'tobias@precis.app',  lens: 'analyst',     bio: 'The sentence is the thought.' },
  { username: 'Isla Vance',     handle: '@ivance',     email: 'isla@precis.app',    lens: 'empath',      bio: 'Literature as witness.' },
];

const REVIEW_TEMPLATES = [
  "Finished {title} by {author} and I'm still in it. The prose doesn't announce itself — it just quietly opens something in you and leaves it open.",
  "{author} writes {title} like someone building a clock from the inside. You only understand the mechanism once the last page closes.",
  "What {author} does in {title} with time is extraordinary. It's not a trick. It's an argument about how memory actually works.",
  "I kept putting {title} down to sit with sentences. {author} is doing something more than narrating — they're excavating.",
  "{title} is the novel I'll be recommending for the rest of the year. {author} has found the exact frequency at which ordinary life becomes unbearable and beautiful.",
  "Two sittings. {title} demanded that. {author} writes grief the way grief actually moves — sideways, suddenly, in the wrong room.",
  "The structure of {title} is its argument. {author} knows this. Every formal choice is thematic.",
  "{author}'s {title} earns its ambition. That's rare. Most ambitious novels collapse under their own weight — this one uses the weight.",
  "I read {title} too fast the first time. {author} is writing for readers willing to slow down. Second read was slower and completely different.",
  "What saves {title} from being unbearable is exactly what makes it great: {author} refuses to look away from the hardest parts.",
];

const RECOMMENDATION_TEMPLATES = [
  "If you haven't read {title} yet, I genuinely envy you the first experience. {author} writes like they're racing to tell you something essential.",
  "The right time to read {title} is now. {author} is doing something no one else is doing right now and you should be there for it.",
  "Two people I trust independently told me to read {title}. They were both right. {author} is working at a different level.",
  "{title} has been in my queue for a year. I finally picked it up and now I'm the person recommending it. {author} earns every page.",
  "For anyone who loved {title}: {author} has this gift for making the interior life feel as dramatic as anything external.",
  "Start {title} on a weekend. You will not want to stop. {author} builds momentum the way few writers can.",
  "The opening chapter of {title} alone is worth your time. {author} establishes tone in the first paragraph and never breaks it.",
  "If {author} is new to you and you want one entry point, {title} is it. Everything they do well is in this book.",
];

const ORIGINAL_TEMPLATES = [
  "There's a kind of reading that happens at 2am when you can't stop. I had that last night. I don't know what to do with it yet.",
  "My grandmother kept her books in the kitchen. I didn't understand why until I was old enough to understand why.",
  "The problem with loving a book too much is you can never loan it out. It becomes yours in a way that won't survive other hands.",
  "I've been thinking about what it means to read the same book twice. The first time you read the book. The second time you read yourself reading it.",
  "There are sentences you carry for years before you understand them. The understanding arrives when you're not ready for it.",
  "Every bookshelf is autobiography. The arrangement tells you something. The wear tells you more.",
  "I read the last page first when I was young. Now I think about what that impulse was — the fear that the story wouldn't survive.",
  "The best annotation I ever read was in a library copy. Seventeen words in the margin of a book I'd been trying to understand for years.",
  "There's a specific grief for books you loved as a child and can't return to. The book hasn't changed. That's the problem.",
  "I read slowly. People apologize to me for this as if it's a flaw. I've stopped correcting them.",
  "A character I loved just died in the book I'm reading. I didn't close it. I sat with it for a while. That's what the author wanted.",
  "The last sentence of a novel is the first thing the author wrote, sometimes. You can tell when that's true.",
  "Reading in translation is reading through glass. The glass is part of it now.",
  "I gave a book to someone once with all my margin notes. I regretted it immediately. Not because they'd judge me — because I'd lost the conversation I'd had with it.",
];

function randomPast(maxDaysAgo) {
  const hoursAgo = Math.random() * maxDaysAgo * 24;
  return new Date(Date.now() - hoursAgo * 3600000);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log('Seeding database...');

  const userCount = await prisma.user.count();
  if (userCount >= 18) {
    console.log(`Already seeded (${userCount} users) — skipping.`);
    return;
  }

  // Wipe existing data before re-seeding
  if (userCount > 0) {
    console.log('  Clearing existing data...');
    await prisma.interaction.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.post.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
  }

  // ── Books ──────────────────────────────────────────────────
  const books = [];
  for (const data of BOOKS) {
    books.push(await prisma.book.create({ data }));
  }
  console.log(`  Created ${books.length} books`);

  // ── Users ──────────────────────────────────────────────────
  const password = await bcrypt.hash('precis123', 12);
  const users = [];
  const inkBases = [800, 1200, 1600, 2400, 3200, 4800];
  for (const data of USERS) {
    const user = await prisma.user.create({
      data: { ...data, password, ink: inkBases[Math.floor(Math.random() * inkBases.length)] + Math.floor(Math.random() * 400) },
    });
    await prisma.userPreference.create({ data: { userId: user.id, preferenceVector: {} } });
    users.push(user);
  }
  console.log(`  Created ${users.length} users`);

  // ── Posts ──────────────────────────────────────────────────
  const posts = [];

  // Reviews: each book gets 3-4 reviews from different users
  for (const book of books) {
    const count = 3 + Math.floor(Math.random() * 2);
    const reviewers = [...users].sort(() => Math.random() - 0.5).slice(0, count);
    for (const user of reviewers) {
      const tmpl = pick(REVIEW_TEMPLATES);
      posts.push(await prisma.post.create({
        data: {
          userId: user.id,
          bookId: book.id,
          type: 'review',
          content: tmpl.replace(/{title}/g, book.title).replace(/{author}/g, book.author),
          tags: ['review', book.genres[0] || 'literary fiction'],
          createdAt: randomPast(6),
        },
      }));
    }
  }

  // Recommendations: each book gets 2 recommendations
  for (const book of books) {
    const recommenders = [...users].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const user of recommenders) {
      const tmpl = pick(RECOMMENDATION_TEMPLATES);
      posts.push(await prisma.post.create({
        data: {
          userId: user.id,
          bookId: book.id,
          type: 'recommendation',
          content: tmpl.replace(/{title}/g, book.title).replace(/{author}/g, book.author),
          tags: ['recommendation', book.genres[0] || 'literary fiction'],
          createdAt: randomPast(7),
        },
      }));
    }
  }

  // Original writing: each user writes 4-6 original posts
  for (const user of users) {
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      posts.push(await prisma.post.create({
        data: {
          userId: user.id,
          type: 'original',
          content: pick(ORIGINAL_TEMPLATES),
          tags: ['original', pick(['reading-life', 'reflection', 'craft'])],
          createdAt: randomPast(7),
        },
      }));
    }
  }
  console.log(`  Created ${posts.length} posts`);

  // ── Interactions (batch insert) ────────────────────────────
  const interactionValues = { like: 2, save: 6, view: 1, click: 3 };
  const interactionRecords = [];

  for (const post of posts) {
    const engagers = [...users]
      .filter(u => u.id !== post.userId)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4 + Math.floor(Math.random() * 10));

    for (const user of engagers) {
      const types = ['view'];
      if (Math.random() > 0.4) types.push('like');
      if (Math.random() > 0.7) types.push('save');
      if (Math.random() > 0.55) types.push('click');

      for (const type of types) {
        interactionRecords.push({
          userId: user.id,
          postId: post.id,
          type,
          value: interactionValues[type],
          createdAt: new Date(new Date(post.createdAt).getTime() + Math.random() * 3600000 * 12),
        });
      }
    }
  }

  await prisma.interaction.createMany({ data: interactionRecords, skipDuplicates: true });
  console.log(`  Created ${interactionRecords.length} interactions`);

  // ── Follows (batch insert) ────────────────────────────────
  const followRecords = [];
  for (const user of users) {
    const toFollow = [...users]
      .filter(u => u.id !== user.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 6 + Math.floor(Math.random() * 6));
    for (const other of toFollow) {
      followRecords.push({ followerId: user.id, followingId: other.id });
    }
  }
  await prisma.follow.createMany({ data: followRecords, skipDuplicates: true });
  console.log(`  Created ${followRecords.length} follows`);

  console.log(`\nSeed complete.`);
  console.log(`  ${users.length} users · ${books.length} books · ${posts.length} posts`);
  console.log(`  All accounts use password: precis123`);
  console.log(`  Login: maya@precis.app / precis123`);
}

seed()
  .catch(err => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
