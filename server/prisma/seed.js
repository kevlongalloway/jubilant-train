/**
 * Database seed — populates books, demo users, and sample posts.
 * Run with: node prisma/seed.js  (from server/ directory)
 *
 * Idempotent: checks if data already exists before inserting.
 * Safe to run on every deploy.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const BOOKS = [
  { title: 'Intermezzo', author: 'Sally Rooney', genres: ['literary fiction', 'contemporary'], metadata: { rating: 4.1, year: 2024, cc: '#8B6A8A' } },
  { title: 'James', author: 'Percival Everett', genres: ['literary fiction', 'historical fiction'], metadata: { rating: 4.5, year: 2024, cc: '#6A8B6A' } },
  { title: 'Orbital', author: 'Samantha Harvey', genres: ['literary fiction', 'science fiction'], metadata: { rating: 4.2, year: 2023, cc: '#5A7AB4' } },
  { title: 'The Vegetarian', author: 'Han Kang', genres: ['literary fiction', 'psychological fiction'], metadata: { rating: 4.0, year: 2015, cc: '#8A6A5A' } },
  { title: 'Beloved', author: 'Toni Morrison', genres: ['literary fiction', 'historical fiction'], metadata: { rating: 4.6, year: 1987, cc: '#6A5A8A' } },
  { title: 'Demon Copperhead', author: 'Barbara Kingsolver', genres: ['literary fiction', 'social commentary'], metadata: { rating: 4.4, year: 2022, cc: '#8A7A5A' } },
  { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', genres: ['literary fiction', 'contemporary'], metadata: { rating: 4.4, year: 2022, cc: '#5A6A8A' } },
  { title: 'Trust', author: 'Hernan Diaz', genres: ['literary fiction', 'historical fiction'], metadata: { rating: 4.3, year: 2022, cc: '#8A7A6A' } },
  { title: 'The Covenant of Water', author: 'Abraham Verghese', genres: ['literary fiction', 'family saga'], metadata: { rating: 4.5, year: 2023, cc: '#5A8A8A' } },
  { title: 'Lessons in Chemistry', author: 'Bonnie Garmus', genres: ['literary fiction', 'historical fiction', 'humor'], metadata: { rating: 4.4, year: 2022, cc: '#8A8A5A' } },
];

const USERS = [
  { username: 'Maya Chen',    handle: '@mchen',   email: 'maya@precis.app',   lens: 'empath',      bio: 'Reading as an act of feeling.' },
  { username: 'Oliver Walsh', handle: '@owalsh',  email: 'oliver@precis.app', lens: 'analyst',     bio: 'Structure is story.' },
  { username: 'Zara Osei',    handle: '@zosei',   email: 'zara@precis.app',   lens: 'philosopher', bio: 'Every sentence is a door.' },
  { username: 'Eli Park',     handle: '@epark',   email: 'eli@precis.app',    lens: 'storyteller', bio: 'What question does this book refuse to answer?' },
  { username: 'Carmen Reyes', handle: '@creyes',  email: 'carmen@precis.app', lens: 'explorer',    bio: 'Borders are for crossing.' },
  { username: 'Jin Torres',   handle: '@jtorres', email: 'jin@precis.app',    lens: 'alchemist',   bio: 'Prose should leave marks.' },
];

const POST_TEMPLATES = [
  { type: 'review',         content: 'Just finished {title} by {author} and I\'m still processing. The way {author} handles time in this novel is extraordinary — every scene feels simultaneously urgent and ancient. 4.5/5.',                                             tags: ['review', 'literary-fiction'] },
  { type: 'recommendation', content: 'If you haven\'t read {title} yet, clear your weekend. {author} writes with a precision that makes every sentence feel inevitable. The kind of book that reorganizes your thinking.',                                                   tags: ['recommendation', 'must-read'] },
  { type: 'original',       content: 'There\'s a particular kind of grief that {title} captures — not the dramatic kind, but the quiet, habitual grief that lives in familiar objects. {author} understands this.',                                                          tags: ['thoughts', 'literary'] },
  { type: 'review',         content: '{title} is the book I\'ll be recommending for the rest of the year. {author} has written something essential — urgent without being preachy, personal without being navel-gazing.',                                                    tags: ['review', 'favorite'] },
  { type: 'original',       content: 'Reading {title} during a rainstorm was the correct choice. Something about the rhythm of {author}\'s prose matches the rhythm of water against glass.',                                                                               tags: ['reading-life', 'mood'] },
];

async function seed() {
  console.log('Seeding database...');

  // Check if already seeded
  const existingUser = await prisma.user.findUnique({ where: { email: 'maya@precis.app' } });
  if (existingUser) {
    console.log('Already seeded — skipping.');
    return;
  }

  // Books
  const books = [];
  for (const data of BOOKS) {
    const book = await prisma.book.create({ data });
    books.push(book);
  }
  console.log(`  Created ${books.length} books`);

  // Users (all share the same demo password)
  const password = await bcrypt.hash('precis123', 12);
  const users = [];
  for (const data of USERS) {
    const user = await prisma.user.create({
      data: { ...data, password, ink: Math.floor(Math.random() * 2000) },
    });
    await prisma.userPreference.create({ data: { userId: user.id, preferenceVector: {} } });
    users.push(user);
  }
  console.log(`  Created ${users.length} demo users`);

  // Posts
  const posts = [];
  for (let i = 0; i < 60; i++) {
    const user     = users[i % users.length];
    const book     = books[i % books.length];
    const template = POST_TEMPLATES[i % POST_TEMPLATES.length];
    const daysAgo  = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date(Date.now() - (daysAgo * 24 + hoursAgo) * 3600000);

    const post = await prisma.post.create({
      data: {
        userId:    user.id,
        bookId:    book.id,
        content:   template.content.replace(/{title}/g, book.title).replace(/{author}/g, book.author),
        type:      template.type,
        tags:      template.tags,
        createdAt,
      },
    });
    posts.push(post);
  }
  console.log(`  Created ${posts.length} posts`);

  // Interactions
  const interactionTypes = { like: 2, save: 6, view: 1, click: 3 };
  let interactionCount = 0;
  for (const post of posts) {
    const count = Math.floor(Math.random() * 10) + 1;
    for (let i = 0; i < count; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      if (user.id === post.userId) continue;
      const type = Object.keys(interactionTypes)[i % 4];
      try {
        await prisma.interaction.create({
          data: { userId: user.id, postId: post.id, type, value: interactionTypes[type] },
        });
        interactionCount++;
      } catch { /* skip duplicates */ }
    }
  }
  console.log(`  Created ${interactionCount} interactions`);

  // Follows
  for (const user of users) {
    for (const other of users.filter(u => u.id !== user.id).slice(0, 3)) {
      try {
        await prisma.follow.create({ data: { followerId: user.id, followingId: other.id } });
      } catch { /* skip duplicates */ }
    }
  }
  console.log('  Created follow relationships');

  console.log('Seed complete. Login: maya@precis.app / precis123');
}

seed()
  .catch(err => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
