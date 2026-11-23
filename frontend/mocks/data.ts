import type { Project, Site } from '@/types/form';

export const PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Project 1',
    description: 'Sample programme 1',
    active: true,
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
    description: 'Sample programme 2',
    active: true,
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
    description: 'Sample programme 3',
    active: true,
    log_schema: {
      'Inga seeds': 'numerical',
      'Cornstalks': 'numerical',
      'Plants fertilized': 'boolean',
      'Notes': 'text',
    },
  },
];

const REGION = { id: 1, name: 'Sample region', latitude: null, longitude: null };

export const SITES: Site[] = [
  { id: 1, project: 1, name: 'Site 1' },
  { id: 2, project: 1, name: 'Site 2' },
  { id: 3, project: 2, name: 'Site 3' },
  { id: 4, project: 3, name: 'Site 4' },
  { id: 5, project: 1, name: 'Site 5' },
].map((site) => ({ ...site, region: REGION, address: '', description: '' }));
