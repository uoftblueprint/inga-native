import type { Project, Region, Site, Village } from "frontend/types/form";

/**
 * Sample programmes, regions, villages and farms for testing the farm search screen
 *
 * 40 made up farms with real Regions
 */


// programes
export const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    name: "Inga Alley Cropping – North Coast",
    description: "Alley cropping with Inga trees",
    active: true,
    log_schema: {
      "Inga seeds": "numerical",
      "Citrus trees": "numerical",
      "Soil tested": "boolean",
      Notes: "text",
    },
  },
  {
    id: 2,
    name: "Highland Soil Recovery",
    description: "Hillside soil restoration with Inga and coffee",
    active: true,
    log_schema: {
      "Inga seeds": "numerical",
      "Coffee plants": "numerical",
      Notes: "text",
    },
  },
];

// ---- Farms ----

let nextSiteId = 1;
function farm(
  project: Project,
  name: string,
  region: Region,
  village: Village | null,
  address: string,
): Site {
  return {
    id: nextSiteId++,
    project: project.id,
    region,
    village,
    name,
    address,
    description: "",
  };
}
