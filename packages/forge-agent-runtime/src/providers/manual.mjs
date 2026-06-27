export const manualProvider = {
  id: "manual",
  label: "Manual Agent Provider",
  mode: "packet",

  canSolve() {
    return true;
  },

  async solve(packet) {
    return {
      ok: true,
      provider: "manual",
      mode: "manual-packet",
      packet,
      message: "Manual provider selected. Send packet to an AI coding agent and place the returned patch in .forge/agent-patches/."
    };
  }
};
