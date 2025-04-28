import { DbgItConfig, Main } from "../../shared/dbg-it";
import { CommandsSpecifier } from "../../shared/dbg-it/main";
import { SharedReplicator, SharedReplicatorLogLevels } from "../../shared/repl/replicator";

export class ClientReplicator<T extends Partial<DbgItConfig>> extends SharedReplicator {
	protected recieveMutex = false;
	public constructor(public readonly parent: Main<T>) {
		super();
	}
	/**
	 * Loads the built in custom replication events.
	 * As of now, there are none...
	 */
	public builtins() {
		this.specify((reg) => {});
	}
	/**
	 * Executes a command on the server.
	 * This is automatically run whenever the client attempts to execute a server command
	 * You shouldn't need to call this manually.
	 */
	public async executeServerCommand(commandString: string): Promise<string | void | undefined> {
		if (this.recieveMutex) error("Already executing server command!", 0);
		this.recieveMutex = true;

		// TODO ugly, must be a better way for this
		while (this.remotes.remotes().s2cSendCommandResult.instance === undefined) task.wait();
		while (this.remotes.remotes().c2sExecuteCommand.instance === undefined) task.wait();

		const running = coroutine.running();
		let result: string | void | undefined = undefined;

		this.remotes.remotes().s2cSendCommandResult.instance!.OnClientEvent.Once((...args: unknown[]) => {
			const [err, res] = args;
			if (err === undefined) error("Command return unexpected result", 0);
			if (err === true) error(res, 0);
			result = res as never;
			coroutine.resume(running);
		});

		this.remotes.remotes().c2sExecuteCommand.instance!.FireServer(commandString);

		coroutine.yield(running);
		this.recieveMutex = false;

		return result;
	}
	/**
	 * Sepcifies custom replication event(s).
	 * You can use this to handle any replication that Dbg-It cannot provide for some reason
	 * Do not base your game's networking system off this. Use a remote library instead.
	 * The end user should not interact with this system at all.
	 * @param spec Command specifier
	 */
	public specify(spec: CommandsSpecifier<SharedReplicatorLogLevels>) {
		this.specifiers.add(spec);
	}
	public init(): void {
		super.init();
		// TODO ugly, must be a better way for this
		while (this.remotes.remotes().c2sHandshake.instance === undefined) task.wait();
		while (this.remotes.remotes().s2cSendSerCommand.instance === undefined) task.wait();
		while (this.remotes.remotes().s2cSendReplCommand.instance === undefined) task.wait();
		this.remotes.remotes().s2cSendSerCommand.instance!.OnClientEvent.Connect((...args: defined[]) => {
			args.mapFiltered((v) => (typeIs(v, "buffer") ? v : undefined)).forEach(async (cmd) => {
				this.parent
					.getRegistry()
					.registerSerialized(cmd, (deser) =>
						this.registry.logs.append(
							"DBG",
							`Registered serialized command ${deser.name} and its children.`,
						),
					);
			});
		});
		// Custom replication commands
		this.remotes.remotes().s2cSendReplCommand.instance!.OnClientEvent.Connect((...args: defined[]) => {
			args.mapFiltered((v) => (typeIs(v, "string") ? v : undefined)).forEach((v) =>
				this.registry
					.executeAsync(v, undefined)
					.andThen((v) => (typeIs(v, "string") ? this.registry.logs.append("INFO", tostring(v)) : undefined))
					.catch((err) => this.registry.logs.append("ERR", tostring(err))),
			);
		});
		this.remotes.remotes().c2sHandshake.instance!.FireServer();
	}
}
