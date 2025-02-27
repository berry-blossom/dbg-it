import linked_list from "@rbxts/berry-linked-list";
import { LiteralKind, StringKind } from "../built-ins/kind";
import { CommandSerializable } from "../data";
import { Kind } from "../kind";
import { CommandContext } from "./context";
import { Permissions } from "./permissions";
import { ReadOnlyTokenStream } from "../token";
import { CommandRegistry } from "../dbg-it";
import { DBGIT_EXDATA_SYMBOL } from "./extraData";
import { BufferBuilder } from "@rbxts/berry-buffer";
import { CommandExecutor } from "./executor";
import { ExecutionError } from "../messages";
import { hookCtxFactory } from "../dbg-it/command-registry/hooks";

export type CommandExecution<A extends defined, T extends [...defined[]] = [A], LL extends string[] = string[]> =
	| ((ctx: CommandContext<A, T, LL>, ...args: T) => string | undefined | void)
	| undefined;

export type AnyCommand<LL extends string[] = string[]> = ReadOnlyCommand<defined, [...defined[]], LL>;

export interface CommandChildrenNode<LL extends string[] = string[]> {
	cmd: AnyCommand<LL>;
	parent: AnyCommand<LL>;
}

export class ReadOnlyCommand<A extends defined, T extends [...defined[]] = [A], LL extends string[] = string[]> {
	protected _executor: CommandExecution<A, T, LL> | undefined;
	/** @hidden */ public permissionBuilder: (p: Permissions<LL>) => Permissions<LL> = (p) => p;
	/** @hidden */ public description: string | undefined;
	/** @hidden */ public readonly parent: AnyCommand<LL> | undefined;
	/** @hidden */ public readonly children: linked_list<CommandChildrenNode<LL>> = new linked_list();
	/** @hidden */ public readonly extraData: ReadonlyArray<string> = [];

	/** @hidden */ public constructor(
		/** @hidden */ public readonly registry: CommandRegistry<unknown, LL>,
		/** @hidden */ public readonly name: string,
		/** @hidden */ public readonly argument: Kind<A>,
		parent: AnyCommand<LL> | undefined = undefined,
	) {
		this.parent = parent;
	}

	/** @hidden */ public getImplementation() {
		return this._executor;
	}

	/**
	 * @returns Names of the expected arguments of all direct children under this command.
	 */
	public getExpectedArguments() {
		return `(${this.children
			.array()
			.mapFiltered((n) => n.cmd.argument.label)
			.join(" | ")})`;
	}

	/**
	 * @returns An array of suggestions to satisfy the argument of this command.
	 * If the argument's suggestion array is empty, it is assumed that there are no suggestions for the command and the input is returned instead.
	 * Assume an array where the size is 1 and the first member is the input string means a valid suggestion is completed.
	 */
	public getSuggestions(input: ReadOnlyTokenStream): string[] {
		// TODO reduce elements based on input string
		let suggestions = [...this.argument.suggestions(ReadOnlyTokenStream.create(input._origin))];
		// If a type does not have suggestions, assume it should not have any.
		const isValid = suggestions.isEmpty();
		// TODO determine validity by fuzzy find on input string and suggestions
		if (isValid && suggestions.isEmpty()) suggestions = [input._origin];
		return suggestions;
	}

	/**
	 * Finds the top level permissions builder for this command, searching through all parent commands until a valid one is found.
	 * @hidden
	 */
	public findTopLevelPermissionsBuilder(): ((p: Permissions<LL>) => Permissions<LL>) | undefined {
		let permB: ((p: Permissions<LL>) => Permissions<LL>) | undefined = this.permissionBuilder;
		let topLevel: AnyCommand<LL> | undefined = this.parent;
		while (topLevel) {
			if (topLevel === undefined) break;
			if (permB !== undefined) break;
			if (topLevel?.permissionBuilder !== undefined) permB = topLevel?.permissionBuilder;
			topLevel = topLevel?.parent;
		}
		return permB;
	}

	/**
	 * Creates a CommandSerializable table which is used to easily serialize commands.
	 * */
	public asSerializable(): CommandSerializable {
		const current: CommandSerializable = {
			name: this.name,
			kind: this.argument.label,
			extraData: this.extraData as Array<string>,
			children: [],
			// This is ugly, gross, and poorly done. Can we do this another way somehow?
			// I architeched permissions to be created at execution time, because
			// it is much easier to handle inheriting higher level permissions that way.
			permissionSerialized: BufferBuilder.display(
				(this.findTopLevelPermissionsBuilder() ?? ((p) => p))(
					new Permissions<LL>(
						this as AnyCommand<LL>,
						new CommandExecutor<LL>(undefined, this as AnyCommand<LL>, this.registry),
					),
				).serialize(),
			),
			impl: this.getImplementation() !== undefined,
		};
		this.children.forEach((child) => {
			current.children.push(child.cmd.asSerializable());
		});
		return current;
	}

	public getExtraData(): ReadonlyArray<string> {
		return this.extraData;
	}
}

export class Command<
	A extends defined,
	T extends [...defined[]] = [A],
	LL extends string[] = string[],
> extends ReadOnlyCommand<A, T, LL> {
	public constructor(
		reg: CommandRegistry<unknown, LL>,
		name: string,
		argument: Kind<A>,
		parent: AnyCommand<LL> | undefined = undefined,
	) {
		super(reg, name, argument, parent);
	}

	/**
	 * Add an argument subcommand to this command.
	 *
	 * @param kind The argument that the subcommand takes
	 * @param builder The command implementation
	 * @returns This command
	 */
	appendArgument<A2 extends defined>(
		kind: Kind<A2>,
		builder: (cmd: Command<A2, [...T, A2], LL>) => ReadOnlyCommand<A2, [...T, A2], LL>,
	): Command<A, T, LL> {
		const subCommand = builder(new Command(this.registry, `${kind.label}`, kind));
		this.children.add({
			cmd: subCommand as never,
			parent: this as never,
		});
		return this;
	}

	/**
	 * Add a literal subcommand to this command.
	 * This is equivalent to using {@link appendArgument} with a {@link LiteralKind} argument.
	 *
	 * @param name Name of the subcommand
	 * @param builder The command implementation
	 * @returns This command
	 */
	public appendLiteral<A2 extends string>(
		name: A2,
		builder: (cmd: Command<A2, [...T, A2], LL>) => ReadOnlyCommand<A2, [...T, A2], LL>,
	): Command<A, T, LL> {
		this.appendArgument(new LiteralKind(name), builder);
		return this;
	}

	/**
	 * Specify the permissions for this command. Permissions are evaluated from the first ancestor of this command, then the children.
	 *
	 * @param builder Permissions builder
	 * @returns This command
	 */
	public permissions(builder: (p: Permissions<LL>) => Permissions<LL>) {
		this.permissionBuilder = builder;
		return this;
	}

	/**
	 * Implements this command's execution function, which is run when the command is executed.
	 *
	 * @param exec The function ran on execution, which contains the arguments of all parent commands
	 * @returns This command
	 */
	public implement(exec: CommandExecution<A, T, LL>) {
		this._executor = exec;
		return this;
	}

	public deimplement() {
		delete this._executor;
		return this;
	}

	/**
	 * Appends extra data in the form of a string to this command.
	 * Extra data is preserved through serialization and deserialization.
	 * This data should be as small as possible as to not bloat the length of the serialized command.
	 * @param data A string which will be preserved through serdes
	 * @returns This command
	 */
	public appendExtraData(data: string | DBGIT_EXDATA_SYMBOL) {
		(this.extraData as Array<string>).push(data);
		return this;
	}

	public static fromSerializable<LL extends string[] = string[]>(
		serialized: CommandSerializable,
		registry: CommandRegistry,
		parent?: AnyCommand<LL>,
	) {
		const root = new Command(registry, serialized.name, new StringKind(), parent as never);
		(root.extraData as Array<string>).push(DBGIT_EXDATA_SYMBOL.DESERIALIZED);
		serialized.children.forEach((child) => {
			const childDeser = Command.fromSerializable(child, registry, root as AnyCommand);
			root.children.add({
				cmd: childDeser as never,
				parent: root as never,
			});
		});
		if (serialized.impl)
			root.implement((ctx) => {
				const replHandle = ctx.registry.hooks.get("SERIALIZED_CMD");
				if (replHandle === undefined) return ctx.throw(ExecutionError.DESER);
				return replHandle.reduce()(
					hookCtxFactory(ctx.command as never, ctx.executor as never, ctx.commandString),
				);
			});
		return root as unknown as Command<string, string[], LL>;
	}
}
