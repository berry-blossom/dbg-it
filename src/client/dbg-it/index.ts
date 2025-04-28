import { Main } from "../../shared/dbg-it";
import { DbgItConfig, DefaultMainConfig } from "../../shared/dbg-it/config";
import { ClientReplicator } from "./clientReplicator";

export interface ClientConfig {
	replicator: boolean;
}

let singleton: DbgItClient;

export class DbgItClient<T extends Partial<DbgItConfig> = typeof DefaultMainConfig> extends Main<T> {
	/** @hidden */ public readonly replicator: ClientReplicator<T>;
	protected constructor(protected readonly settings?: T & Partial<ClientConfig>) {
		super(settings);
		this.replicator = new ClientReplicator(this);
	}

	/**
	 *
	 * @param replicator If the replicator should start of not
	 * @returns The DbgIt Client.
	 */
	public start(replicator: boolean = this.settings?.replicator ?? true) {
		super.start();
		if (replicator) {
			this.replicator.builtins();
			this.replicator.init();
		}
		this._registry.addHook("SERIALIZED_CMD", (ctx) => {
			return this.replicator
				.executeServerCommand(ctx.commandString)
				.catch((err) => error(tostring(err), 0))
				.expect();
		});
		return this;
	}

	public static setup<T extends Partial<DbgItConfig> = typeof DefaultMainConfig>(
		settings?: T & Partial<ClientConfig>,
	): DbgItClient<T> {
		if (singleton !== undefined) return singleton as never;
		singleton = new DbgItClient(settings) as never;
		return singleton as never;
	}
}
