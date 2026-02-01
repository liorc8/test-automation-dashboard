export type AreaConfig = {
  id: string;
  name: string; 
};

export const AREAS: AreaConfig[] = [
  { id: "PRM", name: "PRM" },
  { id: "PRM_OLD", name: "PRM (old)" },
  { id: "ERM", name: "ERM" },
  { id: "ALMAE", name: "Alma Starter" },
  { id: "AUTHORITY", name: "Authorities" },
  { id: "ANALYTICS", name: "Analytics" },
  { id: "API", name: "API" },
  { id: "ACQ", name: "Acquisition" },
  { id: "FULF_OLD", name: "Fulfillment (old)" },
  { id: "FULF", name: "Fulfillment" },
  { id: "RSH", name: "Resource Sharing" },
  { id: "INTEROPERABILITY", name: "Interoperability" },
  { id: "INTEROPERABILITYNG", name: "InteroperabilityNG" },
  { id: "USERS", name: "Users" },
  { id: "LOD", name: "Linked open data" },
  { id: "NMDEDITOR", name: "NMDEditor" },
  { id: "METADATAMANAGEMENT", name: "Metadata Management" },
  { id: "RMANDCONSORTIA", name: "RM and Consortia" },
  { id: "STAFFSEARCH", name: "StaffSearch" },
  { id: "PUBLISHING", name: "Publishing" },
  { id: "GLOBALRS", name: "Rapido" },
  { id: "COLLECTO", name: "Collecto" },
  { id: "SPECTO", name: "Specto" },
  { id: "SPECTOESSENTIAL", name: "Specto Essential" },
  { id: "SPECTOPRESERVATION", name: "Specto Preservation" },
];
