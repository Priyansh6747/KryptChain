import crypto from 'crypto';

/**
 * Deterministic hash function for objects.
 */
export function createHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * Mulberry32 PRNG
 * @param {number} seed 
 * @returns {function} random function returning [0, 1)
 */
export function mulberry32(seed) {
  return function() {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Creates a deterministic random number generator.
 * @param {number} seed 
 */
export class DeterministicRNG {
  constructor(seed) {
    this.randomFunc = mulberry32(seed);
  }

  // Returns float between 0 and 1
  random() {
    return this.randomFunc();
  }

  // Returns integer between min and max (inclusive)
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Select a random element from an array
  randomElement(arr) {
    if (arr.length === 0) return null;
    const index = this.randomInt(0, arr.length - 1);
    return arr[index];
  }
}
