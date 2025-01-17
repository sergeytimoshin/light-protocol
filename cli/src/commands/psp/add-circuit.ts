import { Args, Command, Flags } from "@oclif/core";
import { addCircuit } from "../../psp-utils/addCircuit";
import { initFlags } from "../../psp-utils/init";

export default class InitCommand extends Command {
  static description = "Initialize a PSP project.";

  static args = {
    name: Args.string({
      name: "NAME",
      description: "The name of the project",
      required: true,
    }),
  };
  static flags = {
    circom: Flags.boolean({
      description:
        "Whether the main circuit is a circom circuit not a .light file.",
      default: false,
      required: false,
    }),
    programName: Flags.string({
      description: "The program the circuit will be verified in.",
      required: true,
    }),
    ...initFlags,
  };

  async run() {
    const { flags, args } = await this.parse(InitCommand);
    const { name } = args;

    this.log("🚀 Initializing PSP project...");

    addCircuit({ name, flags });
    this.log("✅ Project initialized successfully");
  }
}
