import { HttpService } from "@rbxts/services";
import { LiteralKind } from "../../built-ins/kind";
import { AnyCommand, Command } from "../../command/command";
import { CommandContext } from "../../command/context";
import { CommandExecutor } from "../../command/executor";
import { Permissions } from "../../command/permissions";
import { ExecutionError, RegistryWarnings } from "../../messages";
import { TokenStream } from "../../token";
import { LogSink } from "../../log";
import { deserializeCommand } from "../../command";
import { CommandSerializable } from "../../data";
import { parseCommandArguments } from "./execution";
import { ExecutionHooks, HookArgs, HookCtx, hookCtxFactory, runHook } from "./hooks";
import { getEnumKeys, Reduceable } from "../../util";

function empty() {}

// The generic for this class represents the return type of `register`
// This is to allow sandboxed types such as command specifiers which will attempt to hide the execution function during registration contexts.

export class CommandRegistry<RS = undefined, LL extends string[] = string[]> {
	/** @hidden */ public readonly commands: Map<string, AnyCommand<LL>> = new Map();
	/** @hidden */ public readonly level: Map<number, number> = new Map();
	/** @hidden */ public readonly hooks: Map<
		keyof typeof ExecutionHooks,
		Reduceable<(...args: HookArgs<LL>[keyof typeof ExecutionHooks]) => string | undefined | void>
	> = new Map();
	protected constructor(
		/** @hidden */ public readonly id: string, // Unique identifier for each registry, used for logging.
		/** @hidden */ public readonly topLevel: number, // Level at which the game executes commands.
		/** @hidden */ public readonly warnL: LL[number], // Shows warnings in the console for depricated or strange behavior.
		public readonly logs: LogSink<LL>,
	) {
		getEnumKeys(ExecutionHooks).forEach((v) => this.hooks.set(v, new Reduceable(() => empty) as never));
	}

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

	public registerSerialized(
		buf: buffer,
		callback: (deser: CommandSerializable) => void,
	): RS extends defined ? RS : CommandRegistry<undefined, LL> {
		const deserialized = deserializeCommand(buf);
		// TODO implement abstract parenting
		const cmd = Command.fromSerializable<LL>(deserialized, this as never, undefined);
		this.commands.set(deserialized.name, cmd as AnyCommand<LL>);
		callback(deserialized);
		return this as never;
	}

	public addHook<T extends keyof typeof ExecutionHooks>(
		hook: T,
		fn: (...args: HookArgs<LL>[T]) => string | undefined | void,
	): () => void {
		return this.hooks.get(hook)?.attach(() => fn as never) ?? empty;
	}

	/**
	 * Executes a command string. Important: this is synchronous! The current thread will halt until the command finishes executing.
	 * @param commandString Command string to execute
	 * @param executor The executor of the command. Passing undefined will run the command with the highest level permission.
	 * @returns A string if one was returned from the command implementation.
	 */
	public execute(commandString: string, executor: Player | undefined): string | void | undefined {
		const tokenized = TokenStream.create(commandString);
		const command = tokenized.getPosition(0) ?? "";
		if (!this.commands.has(command)) error(ExecutionError.NOCMD.format(command), 0);

		const rootCommand = this.commands.get(command)!;
		let argumentsToCommand: defined[] = [command];
		let currentCommand: AnyCommand<LL> = rootCommand;

		let hookErr = runHook<"BEFORE_VALIDATE", LL>(
			this,
			"BEFORE_VALIDATE",
			// for some reason the type checker is struggling here
			// going to just cast to never for now
			hookCtxFactory<LL>(currentCommand, executor, commandString) as never,
		);
		if (hookErr !== undefined) error(hookErr, 0);
		hookErr = undefined;

		// Scale down the command tree with our parsed tokens.
		while (tokenized.inRange()) {
			if (!tokenized.inRange()) break;
			tokenized.next();
			if (!tokenized.inRange()) break;
			const {
				err,
				args,
				command: foundCommand,
			} = parseCommandArguments(this, executor, currentCommand, tokenized, commandString);
			argumentsToCommand = [...argumentsToCommand, ...args];
			currentCommand = foundCommand;
			if (err === undefined) continue;
			if (err === "") break;
			error(err, 0);
		}

		if (currentCommand.getImplementation() === undefined) error(ExecutionError.UNIMPL.format(commandString), 0);

		const ctx = new CommandContext(
			currentCommand as never,
			currentCommand.name,
			commandString,
			new CommandExecutor<LL>(executor, currentCommand, this as CommandRegistry<undefined, LL>),
			this as CommandRegistry<undefined, LL>,
		);

		let permissions: Permissions<LL> | undefined;
		const permissionsBuiler = currentCommand.findTopLevelPermissionsBuilder();
		if (permissionsBuiler !== undefined) {
			permissions = permissionsBuiler(new Permissions<LL>(currentCommand, ctx.executor) as never);
			if (!permissions.canExecute()) return error(permissions._msg, 0);
		}

		hookErr = runHook<"BEFORE_RUN", LL>(
			this,
			"BEFORE_RUN",
			hookCtxFactory<LL>(currentCommand, executor, commandString) as never,
			ctx,
			permissions,
		);
		if (hookErr !== undefined) return hookErr;
		hookErr = undefined;

		const [done, result] = pcall(() => currentCommand.getImplementation()?.(ctx as never, ...argumentsToCommand));

		hookErr = runHook<"AFTER_RUN", LL>(
			this,
			"AFTER_RUN",
			hookCtxFactory<LL>(currentCommand, executor, commandString) as never,
			ctx,
			permissions,
			done,
			typeIs(result, "string") ? result : undefined,
		);
		if (hookErr !== undefined) error(hookErr, 0);
		hookErr = undefined;

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
