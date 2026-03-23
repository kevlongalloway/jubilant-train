/**
 * Large dataset seed — 500 users, 2000 posts, 10000 interactions.
 * Uses @faker-js/faker for realistic generated data.
 * Idempotent: skips if >= 480 users already exist.
 * Run: node prisma/seed-large.js  (from server/ directory, requires DATABASE_URL)
 *
 * Storage estimate: ~5-10 MB — well within Render's 1 GB free tier.
 * All accounts use password: precis123
 * Easy logins: maya@precis.app, oliver@precis.app
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

// ── Constants ────────────────────────────────────────────────

const TARGET_USERS        = 500;
const TARGET_POSTS        = 2000;
const TARGET_INTERACTIONS = 10000;

const LENSES = ['analyst', 'empath', 'philosopher', 'storyteller', 'explorer', 'alchemist'];
const INTERACTION_VALUES  = { like: 2, save: 6, view: 1, click: 3 };
const INTERACTION_TYPES   = Object.keys(INTERACTION_VALUES);

// ── Curated books (same 25 as seed.js) ───────────────────────

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

// ── Post templates (same as seed.js) ─────────────────────────

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
  "Started something new today. Three pages in and I already know it's going to cost me sleep.",
  "The library copy had a name written on the inside cover, crossed out twice. I thought about that person for the entire book.",
  "Sometimes the book you need finds you. I don't believe in much but I believe in that.",
  "Finished something yesterday. I keep picking up my phone to tell someone about it, then putting it down. No one would understand.",
  "The difference between a book you read and a book that reads you is time. You figure out which one it was years later.",
  "I've started underlining in pencil again. Light enough to erase. I can't decide if I'm making peace with it or being a coward.",
  "Three people recommended the same book to me in one week. I'm afraid to start it. What if it's not that good? What if it is?",
  "The chapter I skimmed because I was tired turned out to be the chapter the whole book was building to. I went back.",
  "Re-reading something I loved at twenty-two. The book is patient with me about how much I've changed.",
  "I've been in a reading slump for six weeks. Nothing landed. Then something landed. I'd forgotten what that felt like.",
  "Finished it on the train. I had to sit in the station for twenty minutes before I could get up.",
  "The author kills a character in the third act that I wasn't prepared to lose. I'm still not over it.",
  "A good first sentence is a promise. A good last sentence is the answer to a question you didn't know you were asking.",
  "I've read this paragraph four times. Not because I don't understand it. Because I do.",
  "Some books are better the second time. Some books you should only read once. Knowing which is which is the skill.",
  "Just put it down. One of those books where you feel the weight of it after — not sad exactly, just full.",
  "Twenty pages into something new. The voice is doing something I haven't heard before. Staying very still.",
  "Recommended this one to three people today. That's how I know it got me.",
  "Reading this on my lunch break and it's ruining my ability to think about anything else.",
  "The prose in this is so precise it almost hurts. Like watching someone build a clock with their hands.",
  "Found a new author. Already bought two more of their books before I'm done with this one. A good problem.",
  "This one is hard to put down and hard to pick back up. Both things at once.",
  "Been turning one sentence over in my head all morning. Might be the best sentence I've read all year.",
  "Took me four chapters to understand what this book was actually about. Then it hit. Then everything hit.",
  "Reading this slowly on purpose. I can feel myself rationing it.",
];

// ── Helpers ───────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPast(maxDaysAgo) {
  const hoursAgo = Math.random() * maxDaysAgo * 24;
  return new Date(Date.now() - hoursAgo * 3600000);
}

// ── Main seed ─────────────────────────────────────────────────

async function seedLarge() {
  console.log('Large seed starting...');

  const userCount = await prisma.user.count();
  if (userCount >= 480) {
    console.log(`Already large-seeded (${userCount} users) — skipping.`);
    return;
  }

  // Wipe existing data
  if (userCount > 0) {
    console.log('  Clearing existing data...');
    await prisma.interaction.deleteMany();
    await prisma.commentLike.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.post.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
  }

  // ── Books ────────────────────────────────────────────────────
  const books = [];
  for (const data of BOOKS) {
    books.push(await prisma.book.create({ data }));
  }
  console.log(`  Created ${books.length} books`);

  // ── Users ────────────────────────────────────────────────────
  // Hash once — reuse for all generated accounts
  const password = await bcrypt.hash('precis123', 12);

  const CURATED = [
    { username: 'Maya Chen',       handle: '@mchen',      email: 'maya@precis.app',    lens: 'empath',      bio: 'Reading as an act of feeling.' },
    { username: 'Oliver Walsh',    handle: '@owalsh',     email: 'oliver@precis.app',  lens: 'analyst',     bio: 'Structure is story.' },
    { username: 'Zara Osei',       handle: '@zosei',      email: 'zara@precis.app',    lens: 'philosopher', bio: 'Every sentence is a door.' },
    { username: 'Eli Park',        handle: '@epark',      email: 'eli@precis.app',     lens: 'storyteller', bio: 'What question does this book refuse to answer?' },
    { username: 'Carmen Reyes',    handle: '@creyes',     email: 'carmen@precis.app',  lens: 'explorer',    bio: 'Borders are for crossing.' },
  ];

  const usedHandles = new Set(CURATED.map(u => u.handle));
  const usedEmails  = new Set(CURATED.map(u => u.email));

  const userData = CURATED.map(u => ({
    id: randomUUID(),
    ...u,
    password,
    ink: 1000 + Math.floor(Math.random() * 4000),
  }));

  // Generate remaining users with faker
  while (userData.length < TARGET_USERS) {
    const firstName = faker.person.firstName();
    const lastName  = faker.person.lastName();
    const idx       = userData.length;

    // Build unique handle
    const baseHandle = faker.internet
      .username({ firstName, lastName })
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 14);
    let handle = `@${baseHandle}`;
    if (usedHandles.has(handle)) handle = `@${baseHandle}${idx}`;
    usedHandles.add(handle);

    // Build unique email
    let email = faker.internet.email({ firstName, lastName }).toLowerCase();
    if (usedEmails.has(email)) email = `user${idx}@precis.app`;
    usedEmails.add(email);

    userData.push({
      id:       randomUUID(),
      username: `${firstName} ${lastName}`,
      handle,
      email,
      password,
      lens:     pick(LENSES),
      bio:      faker.lorem.sentence({ min: 4, max: 10 }),
      ink:      100 + Math.floor(Math.random() * 5000),
    });
  }

  await prisma.user.createMany({ data: userData });
  await prisma.userPreference.createMany({
    data: userData.map(u => ({ userId: u.id, preferenceVector: {} })),
  });
  console.log(`  Created ${userData.length} users`);

  // ── Posts ─────────────────────────────────────────────────────
  const postData = [];

  for (let i = 0; i < TARGET_POSTS; i++) {
    const id   = randomUUID();
    const user = pick(userData);

    if (Math.random() < 0.6) {
      // Book-linked post (review or recommendation)
      const book = pick(books);
      const type = Math.random() < 0.6 ? 'review' : 'recommendation';
      const tmpl = type === 'review' ? pick(REVIEW_TEMPLATES) : pick(RECOMMENDATION_TEMPLATES);
      postData.push({
        id,
        userId:    user.id,
        bookId:    book.id,
        type,
        content:   tmpl.replace(/{title}/g, book.title).replace(/{author}/g, book.author),
        tags:      [type, book.genres[0] || 'literary fiction'],
        createdAt: randomPast(60),
      });
    } else {
      // Original post
      postData.push({
        id,
        userId:    user.id,
        type:      'original',
        content:   pick(ORIGINAL_TEMPLATES),
        tags:      ['original', pick(['reading-life', 'reflection', 'craft'])],
        createdAt: randomPast(60),
      });
    }
  }

  // createMany requires bookId to be absent (not null) when using optional relations in some versions;
  // split into chunks of 500 to stay within parameter limits
  const CHUNK = 500;
  for (let i = 0; i < postData.length; i += CHUNK) {
    await prisma.post.createMany({ data: postData.slice(i, i + CHUNK) });
  }
  console.log(`  Created ${postData.length} posts`);

  // ── Interactions ──────────────────────────────────────────────
  const interactionData = [];
  const seen = new Set(); // "userId|postId|type"

  // Keep trying until we hit the target or exhaust reasonable attempts
  const maxAttempts = TARGET_INTERACTIONS * 6;
  for (let attempt = 0; interactionData.length < TARGET_INTERACTIONS && attempt < maxAttempts; attempt++) {
    const user = pick(userData);
    const post = pick(postData);
    if (user.id === post.userId) continue; // no self-interactions

    const type = pick(INTERACTION_TYPES);
    const key  = `${user.id}|${post.id}|${type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    interactionData.push({
      userId:    user.id,
      postId:    post.id,
      type,
      value:     INTERACTION_VALUES[type],
      createdAt: new Date(new Date(post.createdAt).getTime() + Math.random() * 3600000 * 48),
    });
  }

  for (let i = 0; i < interactionData.length; i += CHUNK) {
    await prisma.interaction.createMany({
      data: interactionData.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }
  console.log(`  Created ${interactionData.length} interactions`);

  // ── Follows ───────────────────────────────────────────────────
  const followData  = [];
  const followSeen  = new Set();

  for (const user of userData) {
    // Each user follows 8–25 others
    const count    = 8 + Math.floor(Math.random() * 18);
    const shuffled = userData
      .filter(u => u.id !== user.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    for (const other of shuffled) {
      const key = `${user.id}|${other.id}`;
      if (!followSeen.has(key)) {
        followSeen.add(key);
        followData.push({ followerId: user.id, followingId: other.id });
      }
    }
  }

  for (let i = 0; i < followData.length; i += CHUNK) {
    await prisma.follow.createMany({
      data: followData.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }
  console.log(`  Created ${followData.length} follows`);

  console.log('\nLarge seed complete.');
  console.log(`  ${userData.length} users · ${books.length} books · ${postData.length} posts`);
  console.log(`  ${interactionData.length} interactions · ${followData.length} follows`);
  console.log('  Estimated storage: ~5-10 MB (well within Render free tier 1 GB)');
  console.log('  All accounts use password: precis123');
  console.log('  Login: maya@precis.app / precis123');
}

seedLarge()
  .catch(err => { console.error('Large seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
