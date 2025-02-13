import linked_list from "@rbxts/berry-linked-list";
import { LogSink, LogSubscription, ReadonlyLogSink } from "../log";
import { strictReverseKeys } from "../util/enum";
import { CommandRegistry } from "./command-registry";
import { DefaultMainConfig, DbgItConfig } from "./config";

// Defaults T to K if T is undefined.
type Defaults<T, K> = T extends defined ? T : K;
// Defaults values of T to K if they are undefined, assuming they both extend P
type DeepDefaults<P, T extends P, K extends P> = { [K2 in keyof P]: Defaults<T[K2], K[K2]> };
// Same as Required<T>, but also ensures the values of T are defined.
type EnsureRequired<T> = { [K in keyof T]-?: T[K] & defined };
// Command registry type for only specifying commands.
export type CommandRegistrySpecifier<LL extends string[] = string[]> = Pick<
	CommandRegistry<CommandRegistrySpecifier, LL>,
	"register"
>;
export type CommandsSpecifier<LL extends string[] = string[]> = (
	registry: CommandRegistrySpecifier<LL>,
) => unknown | void;

export class Main<T extends Partial<DbgItConfig> = typeof DefaultMainConfig> {
	protected readonly _sink: LogSink<
		Defaults<EnsureRequired<T>["logLevels"], (typeof DefaultMainConfig)["logLevels"]>
	>;
	protected readonly _reverseExecutionPowerNames;
	protected readonly _registry;
	protected readonly _commandsSpecifiers: linked_list<
		CommandsSpecifier<Defaults<EnsureRequired<T>["logLevels"], (typeof DefaultMainConfig)["logLevels"]>>
	> = new linked_list();
	protected readonly _settings: Readonly<DeepDefaults<DbgItConfig, EnsureRequired<T>, typeof DefaultMainConfig>>;
	protected readonly _playerAdded: linked_list<(ctx: Main<T>, player: Player) => void> = new linked_list();
	public constructor(settings?: T) {
		this._settings = { ...DefaultMainConfig, ...settings } as never;
		this._sink = new LogSink(...(this._settings.logLevels as never)) as never;
		this._reverseExecutionPowerNames = strictReverseKeys(...this._settings.executionPowerNames);
		this._registry = CommandRegistry.create(
			this._settings.executionPowerNames.size() - 1,
			this._sink,
			this._settings.warnLevel,
		);
	}

	/** @hidden */ public getSink(): ReadonlyLogSink<
		Defaults<EnsureRequired<T>["logLevels"], (typeof DefaultMainConfig)["logLevels"]>
	> {
		return this._sink;
	}

	/** @hidden */ public getRegistry() {
		return this._registry;
	}

	/** @hidden */ public getSettings() {
		return table.freeze({ ...this._settings });
	}

	public loadPlayer(player: Player, executionPower: number = this._settings.defaultExecutionPower) {
		this._registry.setExecutionLevelFor(player, executionPower);
	}

	public subscribeLogs(
		subscription: LogSubscription<
			Defaults<EnsureRequired<T>["logLevels"], (typeof DefaultMainConfig)["logLevels"]>
		>,
	) {
		return this._sink.subscribe(subscription);
	}

	public log<LL extends Defaults<EnsureRequired<T>["logLevels"], (typeof DefaultMainConfig)["logLevels"]>>(
		level: LL[number],
		msg: string,
	) {
		return this._sink.append(level, msg);
	}

	public flushLogs() {
		return this._sink.flush();
	}

	public specify(
		spec: CommandsSpecifier<Defaults<EnsureRequired<T>["logLevels"], (typeof DefaultMainConfig)["logLevels"]>>,
	) {
		this._commandsSpecifiers.add(spec);
		return this;
	}

	public execute(command: string, executor?: Player) {
		return this._registry.executeAsync(command, executor);
	}

	public init() {
		this._commandsSpecifiers.forEach((spec) => {
			spec(this._registry);
		});
	}
}
