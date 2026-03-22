/**
 * Database seed — populates books, demo users, and sample posts.
 * Run with: node prisma/seed.js
 *
 * Books come from the app's BOOK_DATA — same titles, authors, genres.
 * Demo users match the app's US (users) array.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Seed Data ────────────────────────────────────────────────

const BOOKS = [
  { title: 'Intermezzo', author: 'Sally Rooney', genres: ['literary fiction', 'contemporary'], metadata: { rating: 4.1, year: 2024, cc: '#8B6A8A', excerpt: 'A novel about two brothers navigating grief and love.' } },
  { title: 'James', author: 'Percival Everett', genres: ['literary fiction', 'historical fiction', 'social commentary'], metadata: { rating: 4.5, year: 2024, cc: '#6A8B6A', excerpt: 'A retelling of Adventures of Huckleberry Finn from Jim\'s perspective.' } },
  { title: 'Orbital', author: 'Samantha Harvey', genres: ['literary fiction', 'science fiction'], metadata: { rating: 4.2, year: 2023, cc: '#5A7AB4', excerpt: 'Six astronauts circle the Earth, observing its beauty and fragility.' } },
  { title: 'The Vegetarian', author: 'Han Kang', genres: ['literary fiction', 'psychological fiction', 'korean literature'], metadata: { rating: 4.0, year: 2015, cc: '#8A6A5A', excerpt: 'A woman\'s decision to stop eating meat spirals into obsession.' } },
  { title: 'Beloved', author: 'Toni Morrison', genres: ['literary fiction', 'historical fiction', 'american literature'], metadata: { rating: 4.6, year: 1987, cc: '#6A5A8A', excerpt: 'A haunting story of trauma, memory, and freedom.' } },
  { title: 'Demon Copperhead', author: 'Barbara Kingsolver', genres: ['literary fiction', 'social commentary', 'american literature'], metadata: { rating: 4.4, year: 2022, cc: '#8A7A5A', excerpt: 'A modern retelling of David Copperfield set in Appalachia.' } },
  { title: 'The Women', author: 'Kristin Hannah', genres: ['historical fiction', 'war fiction', 'women\'s fiction'], metadata: { rating: 4.5, year: 2024, cc: '#8A5A5A', excerpt: 'A young woman becomes a nurse in Vietnam and returns home transformed.' } },
  { title: 'All Fours', author: 'Miranda July', genres: ['literary fiction', 'contemporary', 'feminist fiction'], metadata: { rating: 3.8, year: 2024, cc: '#5A8A7A', excerpt: 'A road trip that becomes a meditation on desire and identity.' } },
  { title: 'The God of the Woods', author: 'Liz Moore', genres: ['mystery', 'thriller', 'historical fiction'], metadata: { rating: 4.3, year: 2024, cc: '#7A8A5A', excerpt: 'A girl disappears from a summer camp in the Adirondacks, 1975.' } },
  { title: 'Knife', author: 'Salman Rushdie', genres: ['memoir', 'literary nonfiction'], metadata: { rating: 4.2, year: 2024, cc: '#7A5A6A', excerpt: 'A memoir about surviving the assassination attempt.' } },
  { title: 'Fourth Wing', author: 'Rebecca Yarros', genres: ['fantasy', 'romance', 'dragons'], metadata: { rating: 4.2, year: 2023, cc: '#8A5A7A', excerpt: 'A war college where students bond with dragons.' } },
  { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', genres: ['literary fiction', 'contemporary', 'friendship'], metadata: { rating: 4.4, year: 2022, cc: '#5A6A8A', excerpt: 'Two game designers collaborate across decades.' } },
  { title: 'Trust', author: 'Hernan Diaz', genres: ['literary fiction', 'historical fiction', 'metafiction'], metadata: { rating: 4.3, year: 2022, cc: '#8A7A6A', excerpt: 'Four versions of the same story reveal who controls the narrative.' } },
  { title: 'The Covenant of Water', author: 'Abraham Verghese', genres: ['literary fiction', 'historical fiction', 'family saga'], metadata: { rating: 4.5, year: 2023, cc: '#5A8A8A', excerpt: 'Three generations of a South Indian family across 77 years.' } },
  { title: 'Happy Place', author: 'Emily Henry', genres: ['romance', 'contemporary', 'women\'s fiction'], metadata: { rating: 4.1, year: 2023, cc: '#8A6A5A', excerpt: 'Exes pretend to still be together during a final vacation.' } },
  { title: 'Iron Flame', author: 'Rebecca Yarros', genres: ['fantasy', 'romance', 'dragons'], metadata: { rating: 4.1, year: 2023, cc: '#7A5A8A', excerpt: 'The sequel to Fourth Wing.' } },
  { title: 'The Midnight Library', author: 'Matt Haig', genres: ['literary fiction', 'fantasy', 'self-help'], metadata: { rating: 4.0, year: 2020, cc: '#5A7A5A', excerpt: 'Between life and death lies a library of infinite possibilities.' } },
  { title: 'Lessons in Chemistry', author: 'Bonnie Garmus', genres: ['literary fiction', 'historical fiction', 'feminist fiction', 'humor'], metadata: { rating: 4.4, year: 2022, cc: '#8A8A5A', excerpt: 'A female chemist becomes a cooking show host in the 1960s.' } },
  { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', genres: ['fantasy', 'romance', 'young adult'], metadata: { rating: 4.1, year: 2015, cc: '#8A5A6A', excerpt: 'A huntress is taken to a magical land by a fae creature.' } },
  { title: 'The House in the Cerulean Sea', author: 'TJ Klune', genres: ['fantasy', 'romance', 'cozy fantasy'], metadata: { rating: 4.6, year: 2020, cc: '#5A6A8A', excerpt: 'A caseworker investigates a magical orphanage.' } },
];

const USERS = [
  { username: 'Maya Chen', handle: '@mchen', email: 'maya@precis.app', lens: 'empath', bio: 'Reading as an act of feeling.' },
  { username: 'Oliver Walsh', handle: '@owalsh', email: 'oliver@precis.app', lens: 'analyst', bio: 'Structure is story.' },
  { username: 'Zara Osei', handle: '@zosei', email: 'zara@precis.app', lens: 'philosopher', bio: 'Every sentence is a door.' },
  { username: 'Eli Park', handle: '@epark', email: 'eli@precis.app', lens: 'storyteller', bio: 'What question does this book refuse to answer?' },
  { username: 'Carmen Reyes', handle: '@creyes', email: 'carmen@precis.app', lens: 'explorer', bio: 'Borders are for crossing.' },
  { username: 'Jin Torres', handle: '@jtorres', email: 'jin@precis.app', lens: 'alchemist', bio: 'Prose should leave marks.' },
];

const POST_TEMPLATES = [
  { type: 'review', content: 'Just finished {title} by {author} and I\'m still processing. The way {author} handles time in this novel is extraordinary — every scene feels simultaneously urgent and ancient. 4.5/5.', tags: ['review', 'literary fiction'] },
  { type: 'recommendation', content: 'If you haven\'t read {title} yet, clear your weekend. {author} writes with a precision that makes every sentence feel inevitable. The kind of book that reorganizes your thinking.', tags: ['recommendation', 'must-read'] },
  { type: 'original', content: 'There\'s a particular kind of grief that {title} captures — not the dramatic kind, but the quiet, habitual grief that lives in familiar objects. {author} understands this.', tags: ['thoughts', 'literary'] },
  { type: 'review', content: '{title} is the book I\'ll be recommending for the rest of the year. {author} has written something essential — urgent without being preachy, personal without being navel-gazing.', tags: ['review', 'favorite'] },
  { type: 'original', content: 'Reading {title} during a rainstorm was the correct choice. Something about the rhythm of {author}\'s prose matches the rhythm of water against glass.', tags: ['reading-life', 'mood'] },
];

// ─── Seed Function ────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data (development only)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.interaction.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.post.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
    console.log('  ✓ Cleared existing data');
  }

  // Create books
  const books = [];
  for (const bookData of BOOKS) {
    const book = await prisma.book.create({ data: bookData });
    books.push(book);
  }
  console.log(`  ✓ Created ${books.length} books`);

  // Create demo users
  const password = await bcrypt.hash('precis123', 12);
  const users = [];
  for (const userData of USERS) {
    const user = await prisma.user.create({
      data: { ...userData, password, ink: Math.floor(Math.random() * 2000) },
    });
    // Bootstrap empty preference
    await prisma.userPreference.create({ data: { userId: user.id, preferenceVector: {} } });
    users.push(user);
  }
  console.log(`  ✓ Created ${users.length} demo users`);

  // Create demo posts
  const posts = [];
  for (let i = 0; i < 60; i++) {
    const user = users[i % users.length];
    const book = books[i % books.length];
    const template = POST_TEMPLATES[i % POST_TEMPLATES.length];

    // Create post N days ago for variety
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date(Date.now() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);

    const content = template.content
      .replace(/{title}/g, book.title)
      .replace(/{author}/g, book.author);

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        bookId: book.id,
        content,
        type: template.type,
        tags: template.tags,
        createdAt,
      },
    });
    posts.push(post);
  }
  console.log(`  ✓ Created ${posts.length} demo posts`);

  // Create sample interactions (simulate engagement)
  let interactionCount = 0;
  for (const post of posts) {
    const numInteractions = Math.floor(Math.random() * 15) + 1;
    const types = ['like', 'save', 'view', 'click'];

    for (let i = 0; i < numInteractions; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      if (user.id === post.userId) continue; // Skip self-interactions

      const type = types[Math.floor(Math.random() * types.length)];
      try {
        await prisma.interaction.create({
          data: {
            userId: user.id,
            postId: post.id,
            type,
            value: { like: 2, save: 6, view: 1, click: 3 }[type],
          },
        });
        interactionCount++;
      } catch {
        // Skip duplicate interactions (unique constraint)
      }
    }
  }
  console.log(`  ✓ Created ${interactionCount} sample interactions`);

  // Create follow relationships
  for (const user of users) {
    const others = users.filter(u => u.id !== user.id);
    const toFollow = others.slice(0, Math.floor(Math.random() * 4) + 1);
    for (const other of toFollow) {
      try {
        await prisma.follow.create({
          data: { followerId: user.id, followingId: other.id },
        });
      } catch {
        // Skip duplicates
      }
    }
  }
  console.log('  ✓ Created follow relationships');

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo login credentials:');
  console.log('  Email: maya@precis.app  Password: precis123');
  console.log('  Email: oliver@precis.app  Password: precis123');
}

seed()
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
