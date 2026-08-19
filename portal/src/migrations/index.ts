import * as migration_20260819_171530_initial from './20260819_171530_initial';

export const migrations = [
  {
    up: migration_20260819_171530_initial.up,
    down: migration_20260819_171530_initial.down,
    name: '20260819_171530_initial'
  },
];
