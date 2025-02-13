import { HttpService, RunService } from "@rbxts/services";
import { LiteralKind } from "../built-ins/kind";
import { AnyCommand, Command } from "../command/command";
import { CommandContext } from "../command/context";
import { CommandExecutor } from "../command/executor";
import { Permissions } from "../command/permissions";
import { CommandSyntaxError, ExecutionError, RegistryWarnings } from "../messages";
import { TokenStream } from "../token";
import { LogSink } from "../log";
import { KindCommandContext } from "../built-ins/kind/context";

// The generic for this class represents the return type of `register`
// This is to allow sandboxed types such as command specifiers which will attempt to hide the execution function during registration contexts.

export class CommandRegistry<RS = undefined, LL extends string[] = string[]> {
	/** @hidden */ public readonly commands: Map<string, AnyCommand<LL>> = new Map();
	/** @hidden */ public readonly level: Map<number, number> = new Map();
	protected constructor(
		/** @hidden */ public readonly id: string, // Unique identifier for each registry, used for logging.
		/** @hidden */ public readonly topLevel: number, // Level at which the game executes commands.
		/** @hidden */ public readonly warnL: LL[number], // Shows warnings in the console for depricated or strange behavior.
		public readonly logs: LogSink<LL>,
	) {}

	/**
	 * @param player The player to get the execution level for. Can be the ID of the player instead.
	 * @param level The execution level to grant. Passing undefined will treat the player as if they have no permissions.
	 * @returns This command registry.
	 */
	public setExecutionLevelFor(player: Player | number, level: number | undefined) {
		const id: number = typeIs(player, "number") ? player : player.UserId;
		if (level !== undefined) this.level.set(id, level);
		else this.level.delete(id);
		return this;
	}

	/**
	 * Meant to get the execution level of a player. To get the top execution level, use the `getTopLevel()`.
	 * @param player The player to get the execution level for. Can be the ID of the player instead.
	 * @returns The execution level for a player
	 */
	public getExecutionLevelFor(player: Player | number) {
		const id: number = typeIs(player, "number") ? player : player.UserId;
		return this.level.get(id) ?? 0;
	}

	// Returns the execution level used wen no executor is provided to `execute`.
	public getTopLevel(): number {
		return this.topLevel;
	}

	/**
	 * Registers a new command under this registry.
	 * @param name
	 * @param builder
	 * @returns This registry, to register more commands.
	 */
	public register<N extends string, C extends Command<N, [N], LL> = Command<N, [N], LL>>(
		name: N,
		builder: (cmd: C) => C,
	): RS extends defined ? RS : CommandRegistry<undefined, LL> {
		if (this.commands.has(name)) this.logs.append(this.warnL, RegistryWarnings.OVERWRITTEN.format(name));
		this.commands.set(
			name,
			builder(
				new Command<N, [N], LL>(this as CommandRegistry<RS, LL>, name, new LiteralKind(name)) as C,
			) as AnyCommand<LL>,
		);
		return this as never;
	}

	/**
	 * Executes a command string. Important: this is syncronous! The current thread will halt until the command finishes executing.
	 * @param commandString Command string to execute
	 * @param executor The executor of the command. Passing undefined will run the command with the highest level permission.
	 * @returns A string if one was returned from the command implementation.
	 */
	public execute(commandString: string, executor: Player | undefined): string | void | undefined {
		const tokenized = TokenStream.create(commandString);
		const command = tokenized.getPosition(0) ?? "";
		if (!this.commands.has(command)) error(ExecutionError.NOCMD.format(command), 0);

		const rootCommand = this.commands.get(command)!;
		const argumentsToCommand: defined[] = [command];
		let currentCommand: AnyCommand<LL> = rootCommand;

		const processNextCommand = (): string | undefined => {
			let foundCommand: AnyCommand<LL> | undefined = undefined;
			let foundArgument: unknown = undefined;
			let didWarnArgPriority = false;

			// Command string too long!
			if (!currentCommand.children.head) return CommandSyntaxError.TOOLONG;

			const kindCtx: KindCommandContext<LL> = {
				logger: this.logs,
				warnLevel: this.warnL,
				executor: executor,
			};

			currentCommand.children.array().forEach((subCommand) => {
				let tokenString = tokenized.get();
				// Overflow the token if it is the last valid one for an argument.
				if (
					subCommand.cmd.children.array().size() <= 0 &&
					// If the parent's commands have any further children, do not overflow the current argument
					subCommand.parent.children
						.array()
						.reduce((accum, current) => math.max(current.cmd.children.array().size(), accum), 0) <= 0
				)
					tokenString = tokenized.getAfter();
				const argument = subCommand.cmd.argument.transform(tokenString, kindCtx);
				const isValid = subCommand.cmd.argument.verify(argument, kindCtx);
				// if (isValid && argument) will compile to check for truthiness :/ we dont want that
				// isValid may be false OR undefined, and argument could be a falsy value!
				if (isValid !== false && isValid !== undefined && argument !== undefined) {
					// Warn the user about argument priority.
					// This may be intended behavior from the end user, so I do not want to throw an error here.
					// This is a bad practice however, so we should warn the user to not do this.
					if ((foundCommand !== undefined || foundArgument !== undefined) && !didWarnArgPriority) {
						this.logs.append(this.warnL, RegistryWarnings.ARGPRIORITY.format(commandString, tokenString));
						didWarnArgPriority = true;
					}
					foundCommand = subCommand.cmd;
					foundArgument = argument;
				}
			});

			if (foundCommand === undefined || foundArgument === undefined)
				return CommandSyntaxError.BADARG.format(tokenized.get(), currentCommand.getExpectedArguments());

			currentCommand = foundCommand;
			argumentsToCommand.push(foundArgument!);

			return currentCommand.children.array().size() <= 0 ? "" : undefined;
		};

		// Scale down the command tree with our parsed tokens.
		while (tokenized.inRange()) {
			if (!tokenized.inRange()) break;
			tokenized.next();
			if (!tokenized.inRange()) break;
			const syntaxError = processNextCommand();
			if (syntaxError === undefined) continue;
			if (syntaxError === "") break;
			error(syntaxError, 0);
		}

		if (currentCommand.getImplementation() === undefined) error(ExecutionError.UNIMPL.format(commandString), 0);

		const ctx = new CommandContext(
			currentCommand as never,
			currentCommand.name,
			commandString,
			new CommandExecutor<LL>(executor, currentCommand, this as CommandRegistry<undefined, LL>),
			this as CommandRegistry<undefined, LL>,
		);

		const permissionsBuiler = currentCommand.findTopLevelPermissionsBuilder();
		if (permissionsBuiler !== undefined) {
			const permissions = permissionsBuiler(new Permissions<LL>(currentCommand, ctx.executor) as never);
			if (!permissions.canExecute()) return error(permissions._msg, 0);
		}

		const [done, result] = pcall(() => currentCommand.getImplementation()?.(ctx as never, ...argumentsToCommand));

		if (!done) error(ExecutionError.UNEXP.format(tostring(result)), 0);

		return result;
	}

	// Same as `execute`, but runs in a Promise.
	public async executeAsync(commandString: string, executor: Player | undefined) {
		return this.execute(commandString, executor);
	}

	public static create<LL extends string[]>(
		topLevel: number,
		logger: LogSink<LL>,
		warnL: LL[number],
	): CommandRegistry<undefined, LL> {
		return new CommandRegistry(HttpService.GenerateGUID(), topLevel, warnL, logger);
	}
}
