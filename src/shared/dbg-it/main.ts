import linked_list from "@rbxts/berry-linked-list";
import { LogSink, LogSubscription, ReadonlyLogSink } from "../log";
import { strictReverseKeys } from "../util/enum";
import { CommandRegistry } from "./command-registry";
import { DefaultMainConfig, DbgItConfig, LogLevelsFromConfig, SafePickFromConfig } from "./config";
import { CommandsSpecifier, SpecificatorUtil } from "./specification";
import { DeepDefaults, EnsureRequired } from "../util/type";

export class Main<Config extends Partial<DbgItConfig> = typeof DefaultMainConfig> {
	protected readonly _sink: LogSink<LogLevelsFromConfig<Config>>;
	protected readonly _reverseExecutionPowerNames: Record<
		SafePickFromConfig<"executionPowerNames", Config>[number],
		number
	>;
	protected readonly _registry: CommandRegistry<undefined, LogLevelsFromConfig<Config>>;
	protected readonly _commandsSpecifiers: linked_list<CommandsSpecifier<LogLevelsFromConfig<Config>>> =
		new linked_list();
	protected readonly _settings: Readonly<DeepDefaults<DbgItConfig, EnsureRequired<Config>, typeof DefaultMainConfig>>;
	protected readonly _playerAdded: linked_list<(ctx: Main<Config>, player: Player) => void> = new linked_list();

	public constructor(settings?: Config) {
		this._settings = { ...DefaultMainConfig, ...settings } as never;
		this._sink = new LogSink(...(this._settings.logLevels as never)) as never;
		this._reverseExecutionPowerNames = strictReverseKeys(...this._settings.executionPowerNames);
		this._registry = CommandRegistry.create(
			this._settings.executionPowerNames.size() - 1,
			this._sink,
			this._settings.warnLevel,
		);

		if (this._settings.logPrefix !== undefined) this._sink.setPrefix(this._settings.logPrefix);
	}

	public getSink(): ReadonlyLogSink<LogLevelsFromConfig<Config>> {
		return this._sink;
	}

	public getRegistry() {
		return this._registry;
	}

	/** @hidden */ public getSettings() {
		return table.freeze({ ...this._settings });
	}

	public loadPlayer(player: Player, executionPower: number = this._settings.defaultExecutionPower) {
		this._registry.setExecutionLevelFor(player, executionPower);
		return this;
	}

	public subscribeLogs(subscription: LogSubscription<LogLevelsFromConfig<Config>>) {
		return this._sink.subscribe(subscription);
	}

	public log<LL extends LogLevelsFromConfig<Config>>(level: LL[number], msg: string) {
		this._sink.append(level, msg);
		return this;
	}

	public flushLogs() {
		return this._sink.flush();
	}

	/**
	 * Specify commands to be registered when this instance is started.
	 * Specificators are a function which consumes a registry, in a context where registering commands is safe.
	 * ```ts
	 * DbgIt.specify((registry) => registry.register("hello-world", (cmd) => cmd.implement((ctx) => "Hello world!")));
	 * ```
	 */
	public specify(...specificators: CommandsSpecifier<LogLevelsFromConfig<Config>>[]) {
		for (const specifier of specificators) this._commandsSpecifiers.add(specifier);
		return this;
	}

	public execute(command: string, executor?: Player) {
		return this._registry.executeAsync(command, executor);
	}

	/** @hidden */ public start() {
		this._commandsSpecifiers.forEach((spec) => {
			spec(this._registry, SpecificatorUtil);
		});
	}
}
