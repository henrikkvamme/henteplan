import { getNorkartCustomerNames } from "../providers/norkart";

interface ProviderRule {
  cities: string[];
  id: string;
  postalRanges: [number, number][];
}

// noinspection MagicNumber
const PROVIDER_RULES: ProviderRule[] = [
  {
    id: "trv",
    cities: ["trondheim"],
    postalRanges: [[7000, 7099]],
  },
  {
    id: "fosen",
    cities: ["indre fosen", "orland", "ørland", "afjord", "åfjord"],
    postalRanges: [[7100, 7180]],
  },
  {
    id: "bir",
    cities: [
      "bergen",
      "askoy",
      "askøy",
      "bjornafjorden",
      "bjørnafjorden",
      "eidfjord",
      "kvam",
      "osteroy",
      "osterøy",
      "samnanger",
      "ulvik",
      "vaksdal",
      "voss",
    ],
    postalRanges: [
      [5003, 5499],
      [5600, 5660],
      [5700, 5786],
    ],
  },
  {
    id: "oslo",
    cities: ["oslo"],
    postalRanges: [[1, 1299]],
  },
  {
    id: "avfallsor",
    cities: ["kristiansand", "vennesla"],
    postalRanges: [
      [4600, 4699],
      [4700, 4715],
    ],
  },
  {
    id: "him",
    cities: [
      "haugesund",
      "karmoy",
      "karmøy",
      "tysvaer",
      "tysvær",
      "bokn",
      "vindafjord",
      "etne",
      "utsira",
    ],
    postalRanges: [[5500, 5599]],
  },
  {
    id: "remidt",
    cities: [
      "kristiansund",
      "molde",
      "orkland",
      "sunndal",
      "surnadal",
      "oppdal",
      "smola",
      "smøla",
      "melhus",
      "skaun",
      "midtre gauldal",
      "heim",
      "hitra",
      "froya",
      "frøya",
      "rennebu",
      "rindal",
      "aure",
      "averoy",
      "averøy",
      "tingvoll",
    ],
    postalRanges: [
      [6400, 6499],
      [6500, 6699],
      [7224, 7299],
      [7332, 7340],
      [7540, 7549],
    ],
  },
  {
    id: "frevar",
    cities: ["fredrikstad"],
    postalRanges: [[1601, 1639]],
  },
  {
    id: "iris",
    cities: [
      "bodo",
      "bodø",
      "fauske",
      "saltdal",
      "sorfold",
      "sørfold",
      "steigen",
      "gildeskal",
      "gildeskål",
      "meloy",
      "meløy",
      "beiarn",
      "hamaroy",
      "hamarøy",
    ],
    postalRanges: [
      [8000, 8099],
      [8290, 8299],
    ],
  },
  {
    id: "rfd",
    cities: ["drammen", "lier", "øvre eiker", "ovre eiker", "modum", "sigdal"],
    postalRanges: [
      [3000, 3099],
      [3350, 3359],
    ],
  },
  {
    id: "renovasjonen",
    cities: ["stavanger", "sandnes"],
    postalRanges: [
      [4000, 4099],
      [4300, 4399],
    ],
  },
  {
    id: "innherred",
    cities: [
      "levanger",
      "verdal",
      "inderoy",
      "inderøy",
      "snasa",
      "snåsa",
      "malvik",
      "stjordal",
      "stjørdal",
      "selbu",
      "tydal",
      "meraker",
      "meråker",
      "frosta",
    ],
    postalRanges: [[7500, 7699]],
  },
];

export async function detectProvider(
  postalCode: string | null,
  city: string | null
): Promise<string | null> {
  const cityLower = city?.toLowerCase() ?? "";
  const postal = Number(postalCode);

  for (const rule of PROVIDER_RULES) {
    const cityMatch = rule.cities.some((c) => cityLower.includes(c));
    const postalMatch = rule.postalRanges.some(
      ([min, max]) => postal >= min && postal <= max
    );
    if (cityMatch || postalMatch) {
      return rule.id;
    }
  }

  // Norkart: match city name against the cached customer municipality list
  if (cityLower) {
    try {
      const customers = await getNorkartCustomerNames();
      if (customers.includes(cityLower)) {
        return "norkart";
      }
    } catch {
      // If the customer list fetch fails, fall through
    }
  }

  return null;
}
