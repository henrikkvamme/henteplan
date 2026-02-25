import { avfallsorProvider } from "./avfallsor";
import { birProvider } from "./bir";
import { frevarProvider } from "./frevar";
import { himProvider } from "./him";
import { innherredProvider } from "./innherred";
import { irisProvider } from "./iris";
import { norkartProvider } from "./norkart";
import { osloProvider } from "./oslo";
import { remidtProvider } from "./remidt";
import { renovasjonenProvider } from "./renovasjonen";
import { rfdProvider } from "./rfd";
import { trvProvider } from "./trv";
import type { WasteProvider } from "./types";

const PROVIDERS: Record<string, WasteProvider> = {
  trv: trvProvider,
  bir: birProvider,
  oslo: osloProvider,
  norkart: norkartProvider,
  avfallsor: avfallsorProvider,
  him: himProvider,
  remidt: remidtProvider,
  frevar: frevarProvider,
  iris: irisProvider,
  rfd: rfdProvider,
  renovasjonen: renovasjonenProvider,
  innherred: innherredProvider,
};

export function getProvider(id: string): WasteProvider | null {
  return PROVIDERS[id] ?? null;
}

export function getAllProviders(): WasteProvider[] {
  return Object.values(PROVIDERS);
}
