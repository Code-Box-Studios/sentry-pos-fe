import * as migration_20260819_174526_initial from './20260819_174526_initial';

export const migrations = [
  {
    up: migration_20260819_174526_initial.up,
    down: migration_20260819_174526_initial.down,
    name: '20260819_174526_initial'
  },
];
