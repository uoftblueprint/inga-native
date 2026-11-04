import type { Project, Site } from '../types/form';

export const PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Project 1',
    log_schema: {
      'Inga seeds': 'numerical',
      'Citrus trees': 'numerical',
      'Soil tested': 'boolean',
      'Notes': 'text',
    },
  },
  {
    id: 2,
    name: 'Project 2',
    log_schema: {
      'Inga seeds': 'numerical',
      'Strawberry plants': 'numerical',
      'Plants watered': 'boolean',
      'Notes': 'text',
    },
  },
  {
    id: 3,
    name: 'Project 3',
    log_schema: {
      'Inga seeds': 'numerical',
      'Cornstalks': 'numerical',
      'Plants fertilized': 'boolean',
      'Notes': 'text',
    },
  },
];

export const SITES: Site[] = [
  { id: 1, projectId: 1, name: 'Site 1' },
  { id: 2, projectId: 1, name: 'Site 2' },
  { id: 3, projectId: 2, name: 'Site 3' },
  { id: 4, projectId: 3, name: 'Site 4' },
  { id: 5, projectId: 1, name: 'Site 5' },
];