import linked_list from "@rbxts/berry-linked-list";
import { LiteralKind } from "../built-ins/kind";
import { CommandSerializable } from "../data";
import { Kind } from "../kind";
import { CommandContext } from "./context";
import { Permissions } from "./permissions";
import { ReadOnlyTokenStream } from "../token";
import { CommandRegistry } from "../dbg-it";

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
	 * @hidden
	 * @returns Names of the expected arguments of all direct children under this command.
	 */
	public getExpectedArguments() {
		return `(${this.children
			.array()
			.mapFiltered((n) => n.cmd.argument.label)
			.join(" | ")})`;
	}

	/**
	 * @hidden
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
	 * TODO implement
	 * @hidden
	 * @returns
	 */
	public getChildSuggestions(input: string): string[] {
		const suggestions: string[] = [];
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
	 * TODO implement
	 * @hidden
	 * */
	public serialize(): CommandSerializable {
		return {} as never;
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
	 * Add a literal argument to this command.
	 * This is equivalent to using {@link appendArgument} with a {@link LiteralKind} argument.
	 *
	 * Ensure you register literal arguments after string arguments, as the string argument will conflict with literal arguments.
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

	// TODO implement
	public static deserialize(serialized: CommandSerializable) {
		// return new Command();
	}
}
