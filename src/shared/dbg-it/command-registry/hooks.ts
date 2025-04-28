import { CommandRegistry } from ".";
import { AnyCommand, CommandContext, Permissions } from "../../command";
import { ExecutionError } from "../../messages";

// Names of hooks, which run at certain points within dbg-it execution and/or operation
export enum ExecutionHooks {
	BEFORE_VALIDATE,
	VALIDATE_ARG,
	BEFORE_RUN,
	AFTER_RUN,
	SERIALIZED_CMD,
}

export interface HookCtx<LL extends string[] = string[]> {
	command: AnyCommand<LL>;
	executor: Player | undefined;
	commandString: string;
}

export type HookArgsConstraint<LL extends string[] = string[]> = Record<
	keyof typeof ExecutionHooks,
	[ctx: HookCtx<LL>, ...unknown[]]
>;

// If you would like to add a hook, you must remember to put the arguments here as well!
export interface HookArgs<LL extends string[] = string[]> extends HookArgsConstraint<LL> {
	BEFORE_VALIDATE: [ctx: HookCtx<LL>];
	BEFORE_RUN: [ctx: HookCtx<LL>, cmdCtx: CommandContext<defined, defined[], LL>, perm: Permissions<LL> | undefined];
	AFTER_RUN: [
		ctx: HookCtx<LL>,
		cmdCtx: CommandContext<defined, defined[], LL>,
		perm: Permissions<LL> | undefined,
		success: boolean,
		result: string | undefined | void,
	];
	SERIALIZED_CMD: [ctx: HookCtx<LL>];
}

// Helper function to create hook context tables
export function hookCtxFactory<LL extends string[] = string[]>(
	command: AnyCommand<LL>,
	executor: Player | undefined,
	commandString: string,
): HookCtx {
	return {
		command: command as never as AnyCommand,
		executor,
		commandString,
	};
}

export function runHook<T extends keyof typeof ExecutionHooks, LL extends string[] = string[]>(
	registry: CommandRegistry<unknown, LL>,
	hook: T,
	...args: HookArgs<LL>[T]
): string | undefined {
	const hookReducable = registry.hooks.get(hook);
	if (hook === undefined) return ExecutionError.NOHOOK.format(hook);
	const msgs = hookReducable!
		.collect()
		.array()
		.mapFiltered((hk) => hk(...args) ?? undefined);
	if (msgs.size() <= 0) return;
	return ExecutionError.HOOKERR.format(hook, msgs.join("\n"));
}
