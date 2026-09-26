import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'task1.html', 'task2.html', 'task3.html', 'task4.html'];
const html = Object.fromEntries(pages.map(page => [page, readFileSync(join(root, page), 'utf8')]));
const css = readFileSync(join(root, 'styles.css'), 'utf8');

function links(markup) {
  return [...markup.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
}

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1] ?? '';
}

test('every page links to all five tasks and marks its current page', () => {
  for (const page of pages) {
    const nav = html[page].match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav, `${page} has a navigation area`);
    assert.deepEqual(links(nav), pages, `${page} links to every task in order`);
    assert.match(nav, new RegExp(`href="${page}" aria-current="page"`));
    assert.equal((nav.match(/aria-current="page"/g) ?? []).length, 1);
  }
});

test('all local links and images exist', () => {
  for (const [page, markup] of Object.entries(html)) {
    for (const [, reference] of markup.matchAll(/(?:href|src)="([^"]+)"/g)) {
      assert.ok(existsSync(join(root, reference)), `${page}: ${reference} exists`);
    }
    for (const [, alt] of markup.matchAll(/<img\b[^>]*alt="([^"]*)"/g)) {
      assert.ok(alt.trim(), `${page} has meaningful image text`);
    }
  }
});

test('Flexbox cards contain images, text and working buttons', () => {
  const cards = [...html['task1.html'].matchAll(/<article class="card">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 3);
  for (const [, card] of cards) {
    assert.match(card, /<img\b/);
    assert.match(card, /<h2>[^<]+<\/h2>/);
    assert.match(card, /<p>[^<]+<\/p>/);
    assert.match(card, /<a class="button" href="task[234]\.html">/);
  }
  assert.match(cssRule('.cards'), /display:\s*flex/);
  assert.match(cssRule('.card'), /flex:\s*1 1 0/);
});

test('Grid layout has its four named areas', () => {
  const page = html['task2.html'];
  for (const element of ['header', 'aside', 'main', 'footer']) {
    assert.match(page, new RegExp(`<${element}\\b`));
  }
  assert.match(cssRule('.grid-page'), /display:\s*grid/);
  assert.match(cssRule('.grid-page'), /"header header"[\s\S]*"sidebar main"[\s\S]*"footer footer"/);
});

test('gallery contains nine distinct images and captions', () => {
  const figures = [...html['task3.html'].matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/g)];
  assert.equal(figures.length, 9);
  const images = figures.map(([, figure]) => {
    assert.match(figure, /<figcaption>[^<]+<\/figcaption>/);
    return figure.match(/src="([^"]+)"/)?.[1];
  });
  assert.equal(new Set(images).size, 9);
  assert.match(cssRule('.gallery'), /display:\s*grid/);
});

test('portfolio combines Grid and Flexbox with a sidebar and footer', () => {
  const page = html['task4.html'];
  assert.equal((page.match(/<article class="project-card">/g) ?? []).length, 3);
  assert.match(page, /<aside class="portfolio-sidebar"/);
  assert.match(page, /<footer class="site-footer"/);
  assert.match(cssRule('.site-header__inner'), /display:\s*flex/);
  assert.match(cssRule('.portfolio-main'), /display:\s*grid/);
  assert.match(cssRule('.project-card'), /display:\s*flex/);
});
