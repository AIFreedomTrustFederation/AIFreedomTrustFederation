import { chooseProvider, listProviders } from "./registry.mjs";
import { reviewPatchText } from "./reviewer.mjs";

export class ForgeAgentRuntime {
  constructor(options = {}) {
    this.preferredProvider = options.preferredProvider ?? null;
  }

  providers() {
    return listProviders();
  }

  async solve(packet) {
    const provider = chooseProvider(packet, this.preferredProvider);

    if (!provider) {
      return {
        ok: false,
        reason: "No enabled provider can solve this packet."
      };
    }

    return provider.solve(packet);
  }

  reviewPatch(text) {
    return reviewPatchText(text);
  }
}
