import { CommandRegistry } from "../dbg-it/command-registry";
import { TokenStream } from "../token";
import { ReadOnlyCommand } from "./command";
import { CommandExecutor } from "./executor";

export class CommandContext<A extends defined, T extends [...defined[]] = defined[]> {
	public constructor(
		public readonly command: ReadOnlyCommand<A, T>,
		public readonly name: string,
		public readonly commandString: string,
		public readonly executor: CommandExecutor,
		public readonly registry: CommandRegistry,
	) {}

	/**
	 * @returns A token stream of the command string used to execute this command.
	 */
	public tokens() {
		return TokenStream.create(this.commandString);
	}
}
