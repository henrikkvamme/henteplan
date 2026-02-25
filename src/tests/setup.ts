import { expect } from "bun:test";
import { createApp } from "@/app";
import type { FractionCategory } from "@/providers/types";

export const app = createApp();

export const VALID_CATEGORIES: Set<FractionCategory> = new Set([
  "carton",
  "christmas_tree",
  "food",
  "garden",
  "glass_metal",
  "hazardous",
  "other",
  "paper",
  "plastic",
  "residual",
  "textile",
  "wood",
]);

export function assertValidPickup(pickup: Record<string, unknown>) {
  expect(pickup).toHaveProperty("date");
  expect(pickup).toHaveProperty("fraction");
  expect(pickup).toHaveProperty("color");
  expect(pickup).toHaveProperty("category");

  // ISO date format YYYY-MM-DD
  expect(pickup.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  // Non-empty fraction name
  expect(typeof pickup.fraction).toBe("string");
  expect((pickup.fraction as string).length).toBeGreaterThan(0);
  // Hex color
  expect(pickup.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  // Valid category
  expect(VALID_CATEGORIES.has(pickup.category as FractionCategory)).toBe(true);
}

export function assertValidAddress(addr: Record<string, unknown>) {
  expect(addr).toHaveProperty("label");
  expect(addr).toHaveProperty("locationId");
  expect(typeof addr.label).toBe("string");
  expect((addr.label as string).length).toBeGreaterThan(0);
  expect(typeof addr.locationId).toBe("string");
  expect((addr.locationId as string).length).toBeGreaterThan(0);
}

export const PROVIDER_FIXTURES: Record<string, string[]> = {
  trv: [
    "Kongens gate 1",
    "Munkegata 1",
    "Innherredsveien 1",
    "Prinsens gate 1",
    "Olav Tryggvasons gate 1",
    "Elgeseter gate 1",
    "Lade allé 1",
    "Dronningens gate 1",
    "Fjordgata 1",
    "Bispegata 1",
    "Nordre gate 1",
  ],
  bir: [
    "Strandgaten 1",
    "Torgallmenningen 1",
    "Nygårdsgaten 1",
    "Olav Kyrres gate 1",
    "Lars Hilles gate 1",
    "Christies gate 1",
    "Kong Oscars gate 1",
    "Kaigaten 1",
    "Marken 1",
    "Vestre Strømkaien 1",
  ],
  oslo: [
    "Karl Johans gate 1",
    "Storgata 1",
    "Grensen 1",
    "Kirkegata 1",
    "Skovveien 1",
    "Akersgata 1",
    "Prinsens gate 1",
    "Torggata 1",
    "Pilestredet 1",
    "Bogstadveien 1",
    "Josefines gate 1",
  ],
  norkart: [
    "Storgata 1 Lillestrøm",
    "Storgata 1 Hamar",
    "Storgata 1 Gjøvik",
    "Storgata 1 Moss",
    "Storgata 1 Sarpsborg",
    "Storgata 1 Arendal",
    "Storgata 1 Tromsø",
    "Storgata 1 Ålesund",
    "Storgata 1 Skien",
    "Storgata 1 Tønsberg",
  ],
  avfallsor: [
    "Markens gate 1",
    "Skippergata 1",
    "Dronningens gate 1",
    "Kirkegata 1",
    "Tordenskjolds gate 1",
    "Gyldenløves gate 1",
    "Rådhusgata 1",
    "Henrik Wergelands gate 1",
    "Festningsgata 1",
    "Elvegata 1",
  ],
  him: [
    "Haraldsgata 2",
    "Strandgata 1",
    "Smedasundet 112",
    "Karmsundgata 10",
    "Åkrehamngata 1",
    "Sørhauggata 100",
    "Haraldsgata 50",
    "Karmøygata 39",
    "Kaigata 1",
    "Torggata 2",
  ],
  remidt: [
    "Storgata 11",
    "Hauggata 10",
    "Skolegata 1",
    "Nedre Enggate 1",
    "Dalegata",
    "Langveien 1",
    "Fosnagata",
    "Clausens Gate 1",
    "Kaibakken",
    "Kirkegata 1",
  ],
  fosen: [
    "Ørland",
    "Botngård",
    "Osen",
    "Åfjord",
    "Bjugn",
    "Fevåg",
    "Vanvikan",
    "Leksvik",
    "Råkvåg",
    "Mosvik",
  ],
  frevar: [
    "Storgata 1",
    "Nygaardsgata 1",
    "Glemmengata 1",
    "Holmegata 1",
    "Cicignongata 1",
    "Brochs gate 1",
    "Lykkeberg 1",
    "Jernbanegata 1",
    "Stortorvet 1",
    "Stabburveien 1",
  ],
  iris: [
    "Sjøgata 1",
    "Storgata 1",
    "Dronningens gate 1",
    "Havnegata 1",
    "Torvgata 1",
    "Bankgata 1",
    "Sandgata 1",
    "Prinsens gate 1",
    "Jernbanegata 1",
    "Kongens gate 1",
  ],
  rfd: [
    "Engene 1",
    "Bragernes torg 1",
    "Grønland 1",
    "Tollbugata 1",
    "Nedre Storgate 1",
    "Øvre Storgate 1",
    "Konnerudgata 1",
    "Rosenkrantzgata 1",
    "Hauges gate 1",
    "Schwartz gate 1",
  ],
  renovasjonen: [
    "Klubbgata 1",
    "Kirkegata 1",
    "Nytorget 1",
    "Breigata 1",
    "Pedersgata 1",
    "Østervåg 1",
    "Løkkeveien 1",
    "Nedre Holmegate 1",
    "Verksgata 1",
    "Kongsgata 1",
  ],
  innherred: [
    "Kirkegata 3",
    "Sjøgata 1",
    "Håkon den godes gate 1",
    "Jernbanegata 1",
    "Stiklestad Alle 1",
    "Nordåkeren",
    "Sørvegen 1",
    "Skogn",
    "Moafjæra 1",
    "Levanger",
  ],
};
