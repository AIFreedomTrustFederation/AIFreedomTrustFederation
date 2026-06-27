export const manualProvider = {
  id: "manual",
  label: "Manual Local Operator",
  mode: "packet",
  enabled: true,
  localOnly: true,
  openSource: true,

  canSolve() {
    return true;
  },

  async health() {
    return {
      ok: true,
      status: "available",
      reason: "Manual provider is always available and requires no API keys."
    };
  },

  async solve(packet) {
    return {
      ok: true,
      provider: "manual",
      mode: "manual-packet",
      packet,
      message: "Manual local provider selected. Use any open-source/local coding model or human operator. No API keys required."
    };
  }
};
