import { WordPair, DifficultyLevel } from '@duodeceit/shared';
import { WORD_PAIRS } from './wordPairs.js';

export interface AssignedWords {
  pair: WordPair;
  majorityWord: string;
  minorityWord: string;
}

export class WordManager {
  private basePairs: WordPair[];
  private customPairs: WordPair[] = [];

  constructor(customPairs?: WordPair[]) {
    this.basePairs = WORD_PAIRS;
    if (customPairs && customPairs.length > 0) {
      this.customPairs = customPairs;
    }
  }

  public setCustomPairs(pairs: WordPair[]): void {
    this.customPairs = pairs;
  }

  public clearCustomPairs(): void {
    this.customPairs = [];
  }

  public getAllPairs(): WordPair[] {
    return this.customPairs.length > 0 ? this.customPairs : this.basePairs;
  }

  public getAvailableCategories(): string[] {
    const all = this.getAllPairs();
    const set = new Set<string>();
    for (const p of all) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }

  public getMatchingPairsCount(
    category: string = 'all',
    difficulty: 'all' | 'ALL' | DifficultyLevel = 'all'
  ): number {
    return this.filterPool(this.getAllPairs(), category, difficulty).length;
  }

  private filterPool(
    pool: WordPair[],
    category: string = 'all',
    difficulty: 'all' | 'ALL' | DifficultyLevel = 'all'
  ): WordPair[] {
    return pool.filter((p) => {
      const matchCategory =
        !category ||
        category.toLowerCase() === 'all' ||
        p.category?.toLowerCase() === category.toLowerCase();
      const matchDifficulty =
        !difficulty ||
        difficulty.toLowerCase() === 'all' ||
        p.difficulty === difficulty;
      return matchCategory && matchDifficulty;
    });
  }

  public getRandomAssignment(
    excludeIds: string[] = [],
    category: string = 'all',
    difficulty: 'all' | 'ALL' | DifficultyLevel = 'all'
  ): AssignedWords {
    const all = this.getAllPairs();
    let filtered = this.filterPool(all, category, difficulty);

    // If filtering produced no results, relax difficulty filter
    if (filtered.length === 0) {
      filtered = this.filterPool(all, category, 'all');
    }
    // If still empty, use all pairs
    if (filtered.length === 0) {
      filtered = all;
    }

    const available = filtered.filter((p) => p.id && !excludeIds.includes(p.id));
    const pool = available.length > 0 ? available : filtered;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const pair = pool[randomIndex];

    // Flip coin to decide which word is minority
    const flip = Math.random() < 0.5;
    const majorityWord = flip ? pair.word1 : pair.word2;
    const minorityWord = flip ? pair.word2 : pair.word1;

    return {
      pair,
      majorityWord,
      minorityWord,
    };
  }
}
