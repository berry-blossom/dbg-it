import { CommandRegistry } from "../dbg-it/command-registry";
import { TokenStream } from "../token";
import { ReadOnlyCommand } from "./command";
import { CommandExecutor } from "./executor";

export class CommandContext<A extends defined, T extends [...defined[]] = defined[], LL extends string[] = string[]> {
	public constructor(
		public readonly command: ReadOnlyCommand<A, T>,
		public readonly name: string,
		public readonly commandString: string,
		public readonly executor: CommandExecutor<LL>,
		public readonly registry: CommandRegistry<unknown, LL>,
	) {}

	/**
	 * @returns A token stream of the command string used to execute this command.
	 */
	public tokens() {
		return TokenStream.create(this.commandString);
	}

	public warn(...msg: string[]) {
		this.registry.logs.append(this.registry.warnL, msg.join(" "));
	}

	public throw(...msg: string[]) {
		error(msg.join(" "), 0);
	}
}
