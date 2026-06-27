import { chooseProvider, listProviders, providerHealth } from "./registry.mjs";
import { reviewPatchText } from "./reviewer.mjs";

export class ForgeAgentRuntime {
  constructor(options = {}) {
    this.preferredProvider = options.preferredProvider ?? null;
  }

  providers() {
    return listProviders();
  }

  async health() {
    return providerHealth();
  }

  async solve(packet) {
    const provider = await chooseProvider(packet, this.preferredProvider);

    if (!provider) {
      return {
        ok: false,
        reason: "No enabled local-only provider can solve this packet."
      };
    }

    return provider.solve(packet);
  }

  reviewPatch(text) {
    return reviewPatchText(text);
  }
}
