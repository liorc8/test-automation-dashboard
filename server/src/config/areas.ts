export type AreaConfig = {
  id: string;
  name: string; 
};

export const AREAS: AreaConfig[] = [
  { id: "prm", name: "PRM" },
  { id: "prm_old", name: "PRM (old)" },
  { id: "Erm", name: "ERM" },
  { id: "almae", name: "Alma Starter" },
  { id: "Authority", name: "Authorities" },
  { id: "analytics", name: "Analytics" },
  { id: "API", name: "API" },
  { id: "acq", name: "Acquisition" },
  { id: "fulf_old", name: "Fulfillment (old)" },
  { id: "fulf", name: "Fulfillment" },
  { id: "rsh", name: "Resource Sharing" },
  { id: "interoperability", name: "Interoperability" },
  { id: "interoperabilityng", name: "InteroperabilityNG" },
  { id: "users", name: "Users" },
  { id: "lod", name: "Linked open data" },
  { id: "NMDEditor", name: "NMDEditor" },
  { id: "metadataManagement", name: "Metadata Management" },
  { id: "RMandConsortia", name: "RM and Consortia" },
  { id: "StaffSearch", name: "StaffSearch" },
  { id: "publishing", name: "Publishing" },
  { id: "globalRS", name: "Rapido" },
  { id: "collecto", name: "Collecto" },
  { id: "specto", name: "Specto" },
  { id: "spectoessential", name: "Specto Essential" },
  { id: "spectopreservation", name: "Specto Preservation" },
];
