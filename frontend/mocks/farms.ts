import type { Project, Region, Site, Village } from "@/types/form";

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

// farms
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
    region: region,
    village: village,
    name: name,
    address: address,
    description: "",
  };
}

// Regions (real department capitals)

const ATLANTIDA: Region = { id: 1, name: "Atlántida", latitude: "15.779170", longitude: "-86.793060" };
const YORO: Region = { id: 2, name: "Yoro", latitude: "15.133300", longitude: "-87.133300" };
const OLANCHO: Region = { id: 3, name: "Olancho", latitude: "14.666390", longitude: "-86.218610" };
const COMAYAGUA: Region = { id: 4, name: "Comayagua", latitude: "14.452220", longitude: "-87.638330" };
const COPAN: Region = { id: 5, name: "Copán", latitude: "14.766700", longitude: "-88.783300" };

export const MOCK_REGIONS: Region[] = [ATLANTIDA, YORO, OLANCHO, COMAYAGUA, COPAN];

// Villages (should belongs to exactly one region)
let nextVillageId = 1;
function village(name: string, region: Region): Village {
  return { id: nextVillageId++, name, region: region.id };
}

const NARANJO_ATL = village("El Naranjo", ATLANTIDA);
const ESPERANZA = village("La Esperanza", ATLANTIDA);
const SAN_ISIDRO_ATL = village("San Isidro", ATLANTIDA);
const COROZAL = village("Corozal", ATLANTIDA);
const SAN_ISIDRO_YORO = village("San Isidro", YORO); // same name as in Atlántida
const LAS_PALMAS = village("Las Palmas", YORO);
const EL_ENCINO = village("El Encino", YORO);
const GUAYABO = village("El Guayabo", OLANCHO);
const CEIBITA = village("La Ceibita", OLANCHO);
const NARANJO_OLA = village("El Naranjo", OLANCHO); // same name as in Atlántida
const LAS_LAGUNAS = village("Las Lagunas", COMAYAGUA);
const LA_CANADA = village("La Cañada", COMAYAGUA);
const AGUAS_PADRE = village("Aguas del Padre", COMAYAGUA);
const BUENA_VISTA = village("Buena Vista", COPAN);
const LOS_PINOS = village("Los Pinos", COPAN);

export const MOCK_VILLAGES: Village[] = [
  NARANJO_ATL, ESPERANZA, SAN_ISIDRO_ATL, COROZAL,
  SAN_ISIDRO_YORO, LAS_PALMAS, EL_ENCINO,
  GUAYABO, CEIBITA, NARANJO_OLA,
  LAS_LAGUNAS, LA_CANADA, AGUAS_PADRE,
  BUENA_VISTA, LOS_PINOS,
];

const NORTH_COAST = MOCK_PROJECTS[0];
const HIGHLAND = MOCK_PROJECTS[1];

const NORTH_COAST_FARMS: Site[] = [
  // Similar names so the worker must be able to tell these apart
  farm(NORTH_COAST, "Finca San Isidro", YORO, SAN_ISIDRO_YORO, "Aldea San Isidro, Olanchito"),
  farm(NORTH_COAST, "Finca San Isidro Norte", ATLANTIDA, SAN_ISIDRO_ATL, "Caserío San Isidro, Tela"), // same village name, other region
  farm(NORTH_COAST, "Finca San Isidro Sur", ATLANTIDA, null, "Km 12 carretera a Tela"), // no village
  farm(NORTH_COAST, "Finca Santa Isabel", YORO, null, "Aldea Santa Isabel, Yoro"), // "san" also starts "Santa"
  farm(NORTH_COAST, "Finca San José", COMAYAGUA, null, "San José de Comayagua"), // another "san"
  farm(NORTH_COAST, "Finca San Juan", YORO, EL_ENCINO, ""), // another "san", no address
  farm(NORTH_COAST, "Finca El Naranjo", ATLANTIDA, NARANJO_ATL, "Aldea El Naranjo, La Ceiba"),
  farm(NORTH_COAST, "Finca El Naranjal", OLANCHO, NARANJO_OLA, "Aldea El Naranjo, Juticalpa"), // same village name, other region
  farm(NORTH_COAST, "Finca Naranjos Unidos", YORO, LAS_PALMAS, ""), // "naran" at the very start of a word
  farm(NORTH_COAST, "Finca Moranjo", ATLANTIDA, COROZAL, "Corozal, La Ceiba"), // "ranjo" mid-word: must NOT match "ranjo"
  farm(NORTH_COAST, "Finca La Ceiba Grande", ATLANTIDA, ESPERANZA, "La Ceiba"), // "la ceiba" matches this and farms with La Ceiba in the address...
  farm(NORTH_COAST, "Finca La Ceibita", OLANCHO, CEIBITA, "La Ceibita, Catacamas"), // ...but "la ceibita" matches only this one

  // Missing village and/or address: no misleading labels
  farm(NORTH_COAST, "Finca La Esperanza", ATLANTIDA, null, ""), // only name and region
  farm(NORTH_COAST, "Parcela Sin Datos", COPAN, null, ""), // only name and region
  farm(NORTH_COAST, "Finca La Paz", COMAYAGUA, null, "La Paz"), // address but no village

  // Long names and addresses so it must wrap, stay readable
  farm(
    NORTH_COAST,
    "Finca Comunitaria Agroforestal de la Cooperativa de Productores Unidos del Valle del Cangrejal",
    ATLANTIDA,
    COROZAL,
    "Km 9 (Cuenca del Cangrejal), carretera a Olanchito, La Ceiba",
  ),
  farm(
    NORTH_COAST,
    "Parcela Demostrativa de Cultivo en Callejones con Inga y Cítricos Número Dos",
    COPAN,
    BUENA_VISTA,
    "Caserío Buena Vista, Santa Rosa de Copán",
  ),

  // Accents and ñ must be typed with the accent to match
  farm(NORTH_COAST, "Finca El Paraíso", COPAN, LOS_PINOS, "Aldea Los Pinos, Copán Ruinas"),
  farm(NORTH_COAST, "Finca Cañaveral", COMAYAGUA, LA_CANADA, "La Cañada, Siguatepeque"), // "cañ" finds it, "can" doesn't
  farm(NORTH_COAST, "Finca Copán Alto", COPAN, null, "Carretera a Copán"),

  // Found only through one field
  farm(NORTH_COAST, "Finca Los Laureles", ATLANTIDA, ESPERANZA, "Km 9 (Cuenca del Cangrejal)"), // "cangrejal": address, after "("
  farm(NORTH_COAST, "Finca El Roble", YORO, EL_ENCINO, "Barrio Abajo, Olanchito"), // "olanchito": address only
  farm(NORTH_COAST, "Finca Las Flores", OLANCHO, null, "Calle Principal, Catacamas"), // "catacamas": address only
  farm(NORTH_COAST, "Finca Santa Rita", COMAYAGUA, AGUAS_PADRE, ""), // "aguas": village only
  farm(NORTH_COAST, "Finca Buenos Aires", OLANCHO, GUAYABO, "Juticalpa"), // "guayabo": village only
  farm(NORTH_COAST, "Finca El Mirador", OLANCHO, null, ""), // "olancho": region only

  // Word breaks other than spaces
  farm(NORTH_COAST, "Finca Monte-Verde", YORO, LAS_PALMAS, "Sector Norte-Sur, Yoro"), // "verde", "sur" after "-"

  // Numbers
  farm(NORTH_COAST, "Finca 2 de Mayo", COMAYAGUA, LAS_LAGUNAS, "Km 4, Comayagua"), // "2", "4"

  // Capitals and extra spaces in the data itself
  farm(NORTH_COAST, "FINCA LA FORTUNA", ATLANTIDA, NARANJO_ATL, "aldea el naranjo"), // all caps / all lowercase
  farm(NORTH_COAST, "Finca  El  Porvenir", YORO, null, "Aldea El Porvenir,  Yoro"), // double spaces: "el porvenir" still matches

  // Village name equals farm name
  farm(NORTH_COAST, "Finca Las Palmas", YORO, LAS_PALMAS, "Caserío Las Palmas, Yoro"),

  // Ordinary farms, one per village, so every village has a match
  farm(NORTH_COAST, "Finca Los Mangos", ATLANTIDA, COROZAL, "Playa Corozal"),
  farm(NORTH_COAST, "Finca Buena Vista", COPAN, BUENA_VISTA, "Caserío Buena Vista"),
  farm(NORTH_COAST, "Finca El Guayabo", OLANCHO, GUAYABO, "El Guayabo, Juticalpa"),
  farm(NORTH_COAST, "Finca Las Lagunas", COMAYAGUA, LAS_LAGUNAS, "Las Lagunas, Siguatepeque"),
  farm(NORTH_COAST, "Finca Los Pinos", COPAN, LOS_PINOS, "Aldea Los Pinos, Dulce Nombre"),
];

// A small second programme, so programme selection still shows. Two names
// repeat from North Coast on purpose: allowed across programmes, and each
// programme's list must only show its own.
const HIGHLAND_FARMS: Site[] = [
  farm(HIGHLAND, "Finca Las Lagunas", COMAYAGUA, LAS_LAGUNAS, "Las Lagunas, Siguatepeque"), // same name as a North Coast farm
  farm(HIGHLAND, "Finca La Cañada", COMAYAGUA, LA_CANADA, "La Cañada, Siguatepeque"),
  farm(HIGHLAND, "Finca Buena Vista", COPAN, BUENA_VISTA, ""), // same name as a North Coast farm
  farm(HIGHLAND, "Finca Los Altos", COPAN, null, "Aldea Los Altos, Dulce Nombre"),
];


export const MOCK_SITES: Site[] = [
  ...NORTH_COAST_FARMS, // The ... takes the farms out of each list and puts them into the new one
  ...HIGHLAND_FARMS
];

/** One programme's farms, sorted by name like the real API. */
export function mockSitesFor(projectId: number): Site[] {
  return MOCK_SITES
  .filter((site) => site.project === projectId)    // keep only this programme's farms
  .sort((a, b) => a.name.localeCompare(b.name));     // A to Z by name, like the real API
}
