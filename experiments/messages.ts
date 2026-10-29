import base from "@/messages/en.json";
import { deepMerge } from "@/lib/merge";

import acSonometer from "./ac-sonometer/messages.en.json";
import currentBalance from "./current-balance/messages.en.json";
import helmholtz from "./helmholtz/messages.en.json";
import resonanceTube from "./resonance-tube/messages.en.json";
import slinky from "./slinky/messages.en.json";

/**
 * English messages: the app's own file plus each practical's messages.en.json
 * (theory, apparatus, steps, tips and its feedback texts live with the plugin).
 */
export const MESSAGES_EN = deepMerge(base, acSonometer, resonanceTube, helmholtz, slinky, currentBalance);
