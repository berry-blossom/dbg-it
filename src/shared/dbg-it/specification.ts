import { RunService } from "@rbxts/services";
import { Command } from "../command";
import { CommandRegistry } from "./command-registry";
import { RegistryWarnings } from "../messages";
import { Main } from "./main";
import { DbgItConfig, DefaultMainConfig, LogLevelsFromConfig } from "./config";
import { cmdsCommand, CmdsCommandOptions } from "../built-ins";

export type RegisterContextCommandRegistry<LL extends string[] = string[]> = Pick<
	CommandRegistry<RegisterContextCommandRegistry, LL>,
	"register"
>;
export type CommandsSpecifier<LL extends string[] = string[]> = (
	registry: RegisterContextCommandRegistry<LL>,
	util: typeof SpecificatorUtil,
) => unknown | void;

export class SpecificatorUtil {
	public static impl = class CommandsSpecificatorUtil {
		public static sink<A extends defined, T extends defined[], LL extends string[] = string[]>(
			cmd: Command<A, T, LL>,
		) {
			return cmd.implement((ctx, ...args) => {});
		}
		public static throw<A extends defined, T extends defined[], LL extends string[] = string[]>(
			cmd: Command<A, T, LL>,
			msg: string = "Unimplemented",
		) {
			return cmd.implement((ctx, ...args) => ctx.throw(msg));
		}
	};

	public static registerCmdsCommand<Config extends Partial<DbgItConfig> = typeof DefaultMainConfig>(
		main: Main<Config>,
		reg: RegisterContextCommandRegistry<LogLevelsFromConfig<Config>>,
		options: Partial<Omit<CmdsCommandOptions<LogLevelsFromConfig<Config>>, "permissionNames">> = {},
		ignoreServerSideWarning: boolean = false,
	) {
		// This command *should* only ever need to be registered client-side
		// Instead of throwing an error and exiting we will just throw a warning instead and hope the
		// server has proper log support set up.
		if (RunService.IsServer() && !ignoreServerSideWarning)
			(reg as CommandRegistry).logs.append((reg as CommandRegistry).warnL, RegistryWarnings.CMDSCMDSERVERSIDE);

		return reg.register(
			"cmds",
			cmdsCommand<LogLevelsFromConfig<Config>>({
				permissionNames: main.getSettings().executionPowerNames,
				...options,
			}),
		);
	}
}
